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

    async service_listing(request_data, user_id, callback){
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
    
        let whereConditions = trending + featured + fav + category;
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

    
}

module.exports = new authModel();