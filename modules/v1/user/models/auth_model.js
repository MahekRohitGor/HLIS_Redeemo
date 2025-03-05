const common = require("../../../../utilities/common");
const database = require("../../../../config/database");
const response_code = require("../../../../utilities/response-error-code");
const md5 = require("md5");
const {default: localizify} = require('localizify');
const { t } = require('localizify');

class authModel{
    async signup(requested_data, callback){
        try{
             const data_received = common.generate_user_detail(requested_data);
             const device_data = common.generateDeviceDetails(requested_data);
             const existingUsers = await common.checkExistingUser(data_received);
             console.log(requested_data);
             
             if (existingUsers.length > 0) {
                 await common.handleExistingUser(existingUsers, requested_data, callback);
             } else {
                 await common.createNewUser(data_received, device_data, requested_data, callback);
             }

        } catch(error){
            console.error("Signup error:", error);
             return callback({
                 code: response_code.OPERATION_FAILED,
                 message: t('signup_error')
             });
        }
        
    }

    async login(request_data, callback){
        const user_data = {
            login_type: request_data.login_type,
            latitude: request_data.latitude,
            longitude: request_data.longitude
        };

        if(request_data.email_id != undefined && request_data.email_id != ""){
            user_data.email_id = request_data.email_id;
        }
        if(request_data.passwords != undefined){
            user_data.passwords = md5(request_data.passwords);
        }
        if(request_data.social_id != undefined && request_data.social_id != ""){
            user_data.social_id = request_data.social_id;
        }
        var selectUserWithCred;
        var params;

        if (request_data.login_type == "S") {
            selectUserWithCred = "SELECT * FROM tbl_user WHERE email_id = ? AND passwords = ? AND signup_type = ?";
            params = [user_data.email_id, user_data.passwords, "S"];
        } else if (user_data.social_id){
            selectUserWithCred = `
                SELECT u.* FROM tbl_user u 
                INNER JOIN tbl_socials s ON u.social_id = s.social_id
                WHERE s.social_id = ? AND u.email_id = ? AND signup_type = ?`;
            params = [user_data.social_id, user_data.email_id, user_data.login_type];
        } else{
            return callback({
                code: response_code.INVALID_REQUEST,
                message: "Invalid Login Type"
            });
        }

        try{
            const [status] = await database.query(selectUserWithCred, params);

            if (status.length === 0) {
                console.log(status.length);
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('no_data_found')
                });
            }

            const user_id = status[0].user_id;

            const token = common.generateToken(40);
            const updateTokenQuery = "UPDATE tbl_user SET token = ?, is_login = 1 WHERE user_id = ?";
            await database.query(updateTokenQuery, [token, user_id]);

            const device_token = common.generateToken(40);
            const updateDeviceToken = "UPDATE tbl_device_info SET device_token = ? WHERE user_id = ?";
            await database.query(updateDeviceToken, [device_token, user_id]);

            if (request_data.latitude && request_data.longitude) {
                const updateLocationQuery = "UPDATE tbl_user SET latitude = ?, longitude = ? WHERE user_id = ?";
                await database.query(updateLocationQuery, [request_data.latitude, request_data.longitude, user_id]);
            }

            common.getUserDetailLogin(user_id, request_data.login_type, (err, userInfo)=>{
                if(err){
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: err
                    });
                }
                else{
                    userInfo.token = token;
                    userInfo.device_token = device_token;
                    return callback({
                        code: response_code.SUCCESS,
                        message: t('login_success'),
                        data: userInfo
                    });

                }
            });

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage
            });
        }

    }

    async verifyOtp(request_data, callback) {
        try {
            console.log("Requested data: ", request_data);

            const {email_id} = request_data;

            const selectUserQuery = "SELECT user_id FROM tbl_user WHERE email_id = ?";
            const [userResult] = await database.query(selectUserQuery, [email_id]);

            if (userResult.length === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Email not registered. Please sign up."
                });
            }

            const user_id = userResult[0].user_id;
    
            const selectUserWithUnverified = "SELECT * FROM tbl_otp WHERE user_id = ?";
            const [result] = await database.query(selectUserWithUnverified, [user_id]);
    
            if (result.length === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "OTP Not Found"
                });
            }
    
            const userOtpData = result[0];
            const currentTime = new Date();
            const expireTime = new Date(userOtpData.expire_time);
    
            if (userOtpData.verify === 1) {
                return callback({
                    code: response_code.SUCCESS,
                    message: "Already Verified",
                    data: userOtpData
                });
            }

            if (currentTime > expireTime) {
                const newOtp = common.generateOtp(4)
                const newExpireTime = new Date();
                newExpireTime.setHours(newExpireTime.getHours() + 1);
    
                const updateOtpQuery = "UPDATE tbl_otp SET otp = ?, expire_time = ? WHERE user_id = ?";
                await database.query(updateOtpQuery, [newOtp, newExpireTime, user_id]);
    
                return callback({
                    code: response_code.SUCCESS,
                    message: "OTP Expired. New OTP sent.",
                    data: { newOtp, expire_time: newExpireTime }
                });
            }
    
            // If OTP is valid, compare with user input
            if (request_data.otp === userOtpData.otp) {
                const updateUserQuery = "UPDATE tbl_otp SET verify = 1 WHERE user_id = ?";
                await database.query(updateUserQuery, [user_id]);

                const updateIsStepQuery = "UPDATE tbl_user SET isstep_ = ? WHERE user_id = ?";
                await database.query(updateIsStepQuery, ['2', user_id]);
    
                return callback({
                    code: response_code.SUCCESS,
                    message: "OTP Verified Successfully"
                });
            } else {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Invalid OTP"
                });
            }
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error Occurred",
                data: error
            });
        }
    }

    async resendOTP(request_data, callback){
        try{
        const {email_id} = request_data;
        const selectUserQuery = "SELECT user_id FROM tbl_user WHERE email_id = ?";
        const [userResult] = await database.query(selectUserQuery, [email_id]);

        if (userResult.length === 0) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Email not registered. Please sign up."
            });
        }

        const user_id = userResult[0].user_id;
        const newOtp = common.generateOtp(4);
        const newExpireTime = new Date();
        newExpireTime.setHours(newExpireTime.getHours() + 1);
        const selectOtpQuery = "SELECT otp, expire_time, verify FROM tbl_otp WHERE user_id = ?";
        const [otpResult] = await database.query(selectOtpQuery, [user_id]);

        if (otpResult.length === 0) {
            const insertOtpQuery = "INSERT INTO tbl_otp (user_id, otp, expire_time, verify) VALUES (?, ?, ?, 0)";
            await database.query(insertOtpQuery, [user_id, newOtp, newExpireTime]);

            console.log(`New OTP for User ID ${user_id}: ${newOtp}`);

            return callback({
                code: response_code.SUCCESS,
                message: "New OTP generated and sent",
                data: { user_id, expire_time: newExpireTime }
            });
        }

        const { otp, expire_time, verify } = otpResult[0];
        const currentTime = new Date();
        if (verify === 1) {
            return callback({
                code: response_code.SUCCESS,
                message: "OTP is already verified",
            });
        }

        if (expire_time < currentTime || verify === 0) {
            const updateOtpQuery = `
                UPDATE tbl_otp SET otp = ?, expire_time = ?, verify = 0 WHERE user_id = ?
            `;
            await database.query(updateOtpQuery, [newOtp, newExpireTime, user_id]);

            console.log(`Updated OTP for User ID ${user_id}: ${newOtp}`);

            return callback({
                code: response_code.SUCCESS,
                message: "New OTP sent",
                data: { user_id, expire_time: newExpireTime }
            });
        }
        }catch (error) {
        return callback({
            code: response_code.OPERATION_FAILED,
            message: "Error Occurred",
            data: error
        });
    }
    }

    async forgotPassword(request_data, callback){
        try{
            console.log(request_data.email_id);
            const data = {};
            if (!request_data.email_id && !request_data.mobile_number) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Please provide either Email or Mobile Number"
                });
            }

            if(request_data.email_id != undefined && request_data.email_id != ""){
                data.email_id = request_data.email_id;
            }
            if(request_data.mobile_number != undefined && request_data.mobile_number != ""){
                data.mobile_number = request_data.mobile_number;
            }
        
            let selectUserQuery = "SELECT * FROM tbl_user WHERE email_id = ? OR mobile_number = ?";
            const [userResult] = await database.query(selectUserQuery, [data.email_id, data.mobile_number]);

            if (userResult.length === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "User not found. Please sign up."
                });
            }

            const user = userResult[0];
            const resetToken = common.generateToken(10);
            data.reset_token = resetToken;
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1);
            data.expires_at = expiresAt;

            const insertTokenQuery = `INSERT INTO tbl_forgot_password SET ?`;
            await database.query(insertTokenQuery, data);
                
            return callback({
                code: response_code.SUCCESS,
                message: t('password_reset_token_sent')
            });

        } catch(error){
            console.log(error)
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || t('forgot_password_error')
            });
        }
    }

    async resetPassword(requested_data, callback){
        const { reset_token, new_password } = requested_data;
    
        try {
            const selectTokenQuery = `
                SELECT email_id FROM tbl_forgot_password 
                WHERE reset_token = ? AND is_active = 1 AND expires_at > NOW()
            `;
    
            const [result] = await database.query(selectTokenQuery, [reset_token]);
    
            if (!result.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('invalid_expired_reset_token')
                });
            }
    
            const email_id = result[0].email_id;
            const hashedPassword = md5(new_password);
    
            const updatePasswordQuery = "UPDATE tbl_user SET passwords = ? WHERE email_id = ?";
            await database.query(updatePasswordQuery, [hashedPassword, email_id]);
    
            const deactivateTokenQuery = "UPDATE tbl_forgot_password SET is_active = 0 WHERE reset_token = ?";
            await database.query(deactivateTokenQuery, [reset_token]);
    
            return callback({
                code: response_code.SUCCESS,
                message: t('password_reset_success')
            });
    
        } catch (error) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.sqlMessage || t('password_reset_error')
            });
        }
    }

    async completeProfile(requested_data, user_id, callback){
        try{
            const {fname, lname, address, date_of_birth, gender, interests} = requested_data;
            console.log("Received Data:", { fname, lname, address, date_of_birth, gender, user_id });
            var findUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [result] = await database.query(findUserQuery, [user_id]);

            if(result.length === 0){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Please Register"
                });
            } 

            const formattedDOB = new Date(date_of_birth).toISOString().split('T')[0];

        const updateUserQuery = `
            UPDATE tbl_user 
            SET fname = ?, lname = ?, address = ?, date_of_birth = ?, gender = ?, 
                isstep_ = ?, is_profile_completed = ? WHERE user_id = ?
        `;
        await database.query(updateUserQuery, [fname, lname, address, formattedDOB, gender, '3', 1, user_id]);

        if (interests && Array.isArray(interests) && interests.length > 0) {
            const insertInterestQuery = `INSERT INTO tbl_user_interest_rel (user_id, interest_id) VALUES ?`;
            const interestValues = interests.map(interest_id => [user_id, interest_id]);
            await database.query(insertInterestQuery, [interestValues]);
        }

        return callback({
            code: response_code.SUCCESS,
            message: "Profile Completed Successfully"
        });

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Error Occurred",
                data: error
            });
        }
    }

    async category_listing(request_data, user_id, callback){
        try{
            var selectCategoryQuery = `SELECT category_name, image_id from tbl_categories`;
            const [categories] = await database.query(selectCategoryQuery);
            
            return callback({
                code: response_code.SUCCESS,
                message: t('categories'),
                data: categories
            });

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: t('some_error_occurred'),
                data: error
            })
        }
    }

    async service_listing(request_data, user_id, user, callback){
        if(request_data.page <= 0){
            var page = 1;
        }
        else{
            var page = request_data.page;
        }

        var limit = 10;
        var start = ((page-1)*limit);
        var featured = "";
        var trending = "";
        var fav = "";
        var category = "";
        var search = "";
        var amenities = "";
        var latitude = user.latitude;
        var longitude = user.longitude;
        var distance_filter = "";
        var nearby = "";

        const updateUserNoTrending = `update 
                                    tbl_service_provider
                                    SET is_trending = 0
                                    where
                                    sp_id NOT in
                                    ( select sp_id from
                                    (select sp_id, review_cnt, avg_rating from 
                                    tbl_service_provider order by avg_rating desc, 
                                    review_cnt desc limit 3) as trending);`;

        await database.query(updateUserNoTrending);

        const updateUserWithTrending = `UPDATE tbl_service_provider sp
                                        LEFT JOIN (
                                            SELECT sp_id 
                                            FROM tbl_service_provider 
                                            ORDER BY avg_rating DESC, review_cnt DESC 
                                            LIMIT 3
                                        ) AS trending ON sp.sp_id = trending.sp_id
                                        SET sp.is_trending = 1
                                        WHERE is_active = 1 and is_deleted = 0;`

        await database.query(updateUserWithTrending);

        const updateUserNofeature = `update 
                                    tbl_service_provider
                                    SET is_featured = 0
                                    where
                                    sp_id NOT in
                                    ( select sp_id from
                                    (select sp_id, avg_rating from 
                                    tbl_service_provider order by avg_rating desc limit 3) as featured);`;

        await database.query(updateUserNofeature);

        const updateUserWithFeature = `UPDATE tbl_service_provider sp
                                        LEFT JOIN (
                                            SELECT sp_id 
                                            FROM tbl_service_provider 
                                            ORDER BY avg_rating DESC
                                            LIMIT 3
                                        ) AS featured ON sp.sp_id = featured.sp_id
                                        SET sp.is_featured = 1
                                        WHERE is_active = 1 and is_deleted = 0;`
                                        
        await database.query(updateUserWithFeature);

        if (request_data.trending) {
            trending = " tbl_service_provider.is_trending = 1 AND ";
        }
        if (request_data.featured) {
            featured = " tbl_service_provider.is_featured = 1 AND ";
        }
        if (request_data.fav) {
            fav = ' tbl_service_provider.sp_id IN (SELECT sp_id FROM tbl_user_fav_sp WHERE user_id = ' + user_id + ') AND ';
        }
        if (request_data.category && Array.isArray(request_data.category) && request_data.category.length > 0) {
            category = " tbl_service_provider.category_id IN (" + request_data.category.join(",") + ") AND ";
        }
        if (request_data.search != '' && request_data.search != undefined) {
            search = ' (tbl_service_provider.title_name LIKE "%' + request_data.search + '%" ) AND ';
        }
        if (request_data.amenities && Array.isArray(request_data.amenities) && request_data.amenities.length > 0) {
            amenities = ` tbl_service_provider.sp_id IN (SELECT sp_id FROM tbl_amenities_sp_relation WHERE amenities_id IN (${request_data.amenities.join(",")})) AND `;
        }        

        if (latitude && longitude && request_data.distance_km) {
            let max_distance = request_data.distance_km;
        
            distance_filter = `
                (6371 * acos(
                    cos(radians(${latitude})) * cos(radians(tbl_service_provider.latitude)) 
                    * cos(radians(tbl_service_provider.longitude) - radians(${longitude})) 
                    + sin(radians(${latitude})) * sin(radians(tbl_service_provider.latitude))
                )) <= ${max_distance} AND `;
        }

        if (latitude && longitude && request_data.nearby) {
        
            nearby = `
                (6371 * acos(
                    cos(radians(${latitude})) * cos(radians(tbl_service_provider.latitude)) 
                    * cos(radians(tbl_service_provider.longitude) - radians(${longitude})) 
                    + sin(radians(${latitude})) * sin(radians(tbl_service_provider.latitude))
                )) <= 500 AND `;
        }
    
        let whereConditions = trending + featured + fav + category + search + amenities + distance_filter + nearby;
        whereConditions = whereConditions.trim();
    
        if (whereConditions.endsWith("AND")) {
            whereConditions = whereConditions.slice(0, -4);
        }
    
        let final_query = `SELECT * FROM tbl_service_provider ${whereConditions ? "WHERE " + whereConditions : ""} LIMIT ${start}, ${limit};`;
        console.log(final_query);

        try{
            const [results] = await database.query(final_query);
            return callback({
                code: response_code.SUCCESS,
                data: results
            })
        } catch(error){
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                data: error
            })
        }
    }

    async list_service_provider(request_data, user_id, user, sp_id, callback) {
        try {
            var latitude = user.latitude;
            var longitude = user.longitude;
            let mainQuery = `SELECT 
                                s.sp_id, 
                                s.title_name, 
                                a.address, 
                                s.latitude, 
                                s.longitude, 
                                (6371 * ACOS(
                                    COS(RADIANS(${latitude})) * COS(RADIANS(s.latitude)) 
                                    * COS(RADIANS(s.longitude) - RADIANS(${longitude})) 
                                    + SIN(RADIANS(${latitude})) * SIN(RADIANS(s.latitude))
                                )) AS distance, 
                                s.review_cnt, 
                                s.contact_number, 
                                s.contact_email, 
                                l.image_name AS logo_image, 
                                c.image_name AS cover_image
                            FROM tbl_service_provider s 
                            LEFT JOIN tbl_address a ON a.address_id = s.address_id 
                            LEFT JOIN tbl_images l ON l.image_id = s.logo_img_id 
                            LEFT JOIN tbl_images c ON c.image_id = s.cover_image_id
                            WHERE s.sp_id = ?;`;
    
            const [mainResult] = await database.query(mainQuery, [sp_id]);
    
            if (mainResult.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Service provider not found",
                    data: null
                });
            }
    
            let additionalData = {};
            if (request_data.about) {
                let aboutQuery = `SELECT s.about_text FROM tbl_service_provider s WHERE s.sp_id = ?;`;
                let amenitiesQuery = `SELECT a.amenities_name 
                                      FROM tbl_amenities_sp_relation ar 
                                      LEFT JOIN tbl_amenities a ON ar.amenities_id = a.amenities_id 
                                      WHERE ar.sp_id = ? AND ar.is_active = 1;`;
                let galleryQuery = `SELECT i.image_name 
                                    FROM tbl_service_provider_gallery g 
                                    JOIN tbl_images i ON g.image_id = i.image_id 
                                    WHERE g.sp_id = ? AND g.is_active = 1;`;
    
                const [aboutResult] = await database.query(aboutQuery, [sp_id]);
                const [amenitiesResult] = await database.query(amenitiesQuery, [sp_id]);
                const [galleryResult] = await database.query(galleryQuery, [sp_id]);
    
                additionalData.about_text = aboutResult.length > 0 ? aboutResult[0].about_text : "";
                additionalData.amenities = amenitiesResult.map(row => row.amenities_name);
                additionalData.gallery_images = galleryResult.map(row => row.image_name);
                console.log(additionalData);
            }
    
            if (request_data.branches) {
                let branchesQuery = `SELECT b.branch_id, b.branch_name, b.avg_rating, i.image_name AS branch_image, b.desc_ 
                                     FROM tbl_branch b 
                                     LEFT JOIN tbl_images i ON b.branch_image = i.image_id 
                                     WHERE b.sp_id = ? AND b.is_active = 1;`;
    
                const [branchesResult] = await database.query(branchesQuery, [sp_id]);
                additionalData.branches = branchesResult;
            }
    
            if (request_data.vouchers) {
                let vouchersQuery = `SELECT v.voucher_id, v.voucher_code, v.title, v.descriptions, v.saving_amt, v.expire_date, i.image_name AS voucher_banner 
                                     FROM tbl_voucher_sp_relation vr
                                     JOIN tbl_vouchers v ON vr.voucher_id = v.voucher_id
                                     LEFT JOIN tbl_images i ON v.voucher_banner_id = i.image_id
                                     WHERE vr.sp_id = ? AND vr.is_active = 1;`;
    
                const [vouchersResult] = await database.query(vouchersQuery, [sp_id]);
                additionalData.vouchers = vouchersResult;
            }
    
            if (request_data.rating_review) {
                let ratingsQuery = `SELECT r.rating, r.reviews, u.user_id, u.fname, u.lname 
                                    FROM tbl_ratings_review r 
                                    JOIN tbl_user u ON r.user_id = u.user_id
                                    WHERE r.sp_id = ? AND r.is_active = 1;`;
    
                const [ratingsResult] = await database.query(ratingsQuery, [sp_id]);
                additionalData.ratings_reviews = ratingsResult;
            }
    
            return callback({
                code: response_code.SUCCESS,
                data: { ...mainResult[0], ...additionalData }
            });
    
        } catch (error) {
            console.error(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR OCCURRED",
                data: error
            });
        }
    }
    
    async redeem_vouchers(request_data, user_id, callback){
        try{
            const { voucher_id, sp_id } = request_data;
            const query = `SELECT voucher_id, saving_amt, expire_date from tbl_vouchers where voucher_id = ${voucher_id} and is_active = 1 and is_deleted = 0`;
            const [voucherResult] = await database.execute(query);
            console.log(voucherResult);

            console.log("voucher_id type:", typeof voucher_id);

            if (!voucherResult) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: "Voucher not found or inactive",
                    data: null
                });
            }

            if (new Date(voucherResult.expire_date) < new Date()) {
                return callback({
                    code: response_code.BAD_REQUEST,
                    message: "This voucher has expired",
                    data: null
                });
            }

        const redemptionCheckQuery = `
            SELECT * FROM tbl_voucher_redemptions 
            WHERE user_id = ? AND voucher_id = ?;
        `;
        const [redemptionCheck] = await database.query(redemptionCheckQuery, [user_id, voucher_id]);
        if (redemptionCheck.length > 0) {
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "You have already redeemed this voucher",
                data: null
            });
        }

        const insertRedemptionQuery = `
            INSERT INTO tbl_voucher_redemptions (user_id, sp_id, voucher_id, status, created_at)
            VALUES (?, ?, ?, 'SUCCESS', NOW());
        `;
        await database.query(insertRedemptionQuery, [user_id, sp_id, voucher_id]);

        return callback({
            code: response_code.SUCCESS,
            message: "Voucher redeemed successfully!",
            data: {
                user_id,
                voucher_id,
                saved_amount: voucherResult[0].saving_amt
            }
        });

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR",
                data: error.message
            });
        }
    }

    async list_user_favs(request_data, user_id, callback){
        try{
            var query = "";
            if(request_data.sp_fav){
                query = `SELECT * from tbl_service_provider where sp_id in (SELECT sp_id from tbl_user_fav_sp WHERE user_id = ${user_id})`;
            } else if(request_data.voucher_fav){
                query = `SELECT * from tbl_vouchers where voucher_id in (SELECT voucher_id from tbl_user_fav_voucher WHERE user_id = ${user_id})`;
            } else{
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "SOME ERROR OCCURED PLEASE SELECT FAV type"
                })
            }

            const [results] = await database.query(query);

            if(results.length < 0){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "No DATA FOUND"
                });
            }

            else{
                return callback({
                    code: response_code.SUCCESS,
                    message: "HERE IS DATA",
                    data: results
                });
            }

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "SOME ERROR OCCURED",
                data: error
            });
        }
    }
    
    async list_notification(request_data, user_id, callback){
        try{

            const query = `SELECT * FROM tbl_notification where user_id = ${user_id}`;
            const [result] = await database.query(query);

            if(result.length < 0){
                return callback({
                    code: response_code.SUCCESS,
                    message: "NO NOTIFICATION FOUND"
                });
            }
            return callback({
                code: response_code.SUCCESS,
                message: "NOTIFICATION FOUND",
                data: result
            });

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: "Some Error Occured",
                data: error
            });
        }
    }

    async change_password(request_data, user_id, callback){
        var selectQuery = "SELECT * FROM tbl_user WHERE user_id = ? and is_login = 1";
        try {
            const [rows] = await database.query(selectQuery, [user_id]);
            
            if (!rows || rows.length === 0) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('no_data_found')
                });
            }
            const user = rows[0];
            if(user.signup_type != "S"){
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: "Cant Change Password for Signup with Socials"
                })
            }
    
            const oldPasswordHash = md5(request_data.old_password);
            const newPasswordHash = md5(request_data.new_password);

            if (oldPasswordHash !== user.passwords) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: t('old_password_mismatch')
                });
            }
    
            if (newPasswordHash === user.passwords) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: t('old_new_password_same')
                });
            }
    
            const data = {
                passwords: newPasswordHash
            };

            const updateQuery = "UPDATE tbl_user SET ? where user_id = ?";
            await database.query(updateQuery, [data, user_id]);

            const selectUser = "SELECT * FROM tbl_user where user_id = ?"
            const [result] = await database.query(selectUser, [user_id]);

            return callback({
                code: response_code.SUCCESS,
                message: t('password_changed_success'),
                data: result
            })
    
        } catch (error) {
            console.error('Change Password Error:', error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error.message || t('password_change_error')
            });
        }
    }

    async edit_profile(request_data, user_id, callback) {
        try {
            const allowedFields = ["fname", "lname", "date_of_birth", "address", "gender"];
            let updateFields = [];
            let values = [];
    
            for (let key of allowedFields) {
                if (request_data[key] !== undefined) {
                    updateFields.push(`${key} = ?`);
                    values.push(request_data[key]);
                }
            }
    
            if (updateFields.length === 0 && !Array.isArray(request_data.interests)) {
                return callback({
                    code: response_code.NO_CHANGE,
                    message: t("no_valid_fields_update"),
                });
            }
    
            if (updateFields.length > 0) {
                updateFields.push("updated_at = CURRENT_TIMESTAMP()");
                values.push(user_id);
    
                const updateQuery = `
                    UPDATE tbl_user 
                    SET ${updateFields.join(", ")}
                    WHERE user_id = ? AND is_active = 1 AND is_deleted = 0 AND is_login = 1
                `;
    
                const [result] = await database.query(updateQuery, values);
                if (result.affectedRows === 0) {
                    return callback({
                        code: response_code.NOT_FOUND,
                        message: t("profile_update_no_changes"),
                    });
                }
            }

            if (Array.isArray(request_data.interests)) {
                console.log("here");
                await database.query("DELETE FROM tbl_user_interest_rel WHERE user_id = ?", [user_id]);
    
                if (request_data.interests.length > 0) {
                    const insertValues = request_data.interests.map((interest_id) => [user_id, interest_id]);
                    const insertQuery = "INSERT INTO tbl_user_interest_rel (user_id, interest_id) VALUES ?";
                    await database.query(insertQuery, [insertValues]);
                }
            }
    
            return callback({
                code: response_code.SUCCESS,
                message: t("profile_updated_success"),
            });
        } catch (error) {
            console.error(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: t("profile_update_error"),
            });
        }
    }

    async logout(request_data, user_id, callback){
        try{
            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ? and is_login = 1";
            const [info] = await database.query(select_user_query, [user_id]);
            if(info.length > 0){
                const updateDeviceTokenQuery = "UPDATE tbl_device_info SET device_token = '', updated_at = NOW() WHERE user_id = ?";
            const updateTokenQuery = "UPDATE tbl_user SET token = '', is_login = 0 WHERE user_id = ?";
    
            await Promise.all([
                database.query(updateDeviceTokenQuery, [user_id]),
                database.query(updateTokenQuery, [user_id])
            ]);
    
            const getUserQuery = "SELECT * FROM tbl_user WHERE user_id = ?";
            const [updatedUser] = await database.query(getUserQuery, [user_id]);
    
            return callback({
                code: response_code.SUCCESS,
                message: t('logout_success'),
                data: updatedUser[0]
            });

            } else{
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('user_not_found_or_logged_out')
                });
            }

        } catch(error){
            return callback({
                code: response_code.OPERATION_FAILED,
                message: t('some_error_occurred'),
                data: error
            })
        }
    }

    async delete_account(request_data, user_id, callback) {
        try {

            var select_user_query = "SELECT * FROM tbl_user WHERE user_id = ? and is_login = 1";
            const [info] = await database.query(select_user_query, [user_id]);

            if (info.length === 0) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: t('login_required')
                });
            }
            
            const selectUserQuery = "SELECT * FROM tbl_user WHERE user_id = ? AND is_deleted = 0";
            const [user] = await database.query(selectUserQuery, [user_id]);
    
            if (!user.length) {
                return callback({
                    code: response_code.NOT_FOUND,
                    message: t('user_already_deleted')
                });
            }
    
            const deleteUserQuery = "UPDATE tbl_user SET is_deleted = 1, is_active = 0, is_login = 0 WHERE user_id = ?";
            await database.query(deleteUserQuery, [user_id]);
    
            const deleteReviewQuery = "UPDATE tbl_ratings_review SET is_deleted = 1, is_active=0 WHERE user_id = ?";
            await database.query(deleteReviewQuery, [user_id]);
    
            const deleteInterestsQuery = "UPDATE tbl_user_interest_rel SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteInterestsQuery, [user_id]);
    
            const deleteFavSPQuery = "UPDATE tbl_user_fav_sp SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteFavSPQuery, [user_id]);
    
            const deleteFavVoucherQuery = "UPDATE tbl_user_fav_voucher SET is_deleted = 1 WHERE user_id = ?";
            await database.query(deleteFavVoucherQuery, [user_id]);

            return callback({
                code: response_code.SUCCESS,
                message: t('account_deleted')
            });
    
        } catch (error) {
            console.log(error);
            return callback({
                code: response_code.OPERATION_FAILED,
                message: error
            });
        }
    }
    
}

module.exports = new authModel();