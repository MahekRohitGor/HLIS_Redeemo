var database = require("../config/database");
const md5 = require("md5");
const response_code = require("./response-error-code");
const {default: localizify} = require('localizify');
const { t } = require('localizify');

class common{
    generateOtp(length){
        if(length <= 0){
            throw new Error("OTP length must be greater than 0");
        }
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }

    generateToken(length){
        if(length <= 0){
            throw new Error("Token length must be greater than 0");
        }
        const alphaNumeric = '0123456789qwertyuiopasdfghjklzxcvbnm';
        let token = '';
        for (let i = 0; i < length; i++) {
            token += alphaNumeric[Math.floor(Math.random() * alphaNumeric.length)];
        }
        return token;
    }

    response(res,message){
        return res.json(message);
    }

    async getUserDetail(user_id, login_user_id, callback){
        var selectUserQuery = `SELECT user_id, fname, email_id, mobile_number,
                   lname, address, date_of_birth,
                   profile_pic, is_profile_completed from tbl_user where user_id = ?`;
        
        try{

            const [user] = await database.query(selectUserQuery, [user_id])
            if(user.length > 0){
                return callback(undefined, user[0]);
            }
            else{
                return callback("No User Found", []);
            }

        } catch(error){
            return callback(error, []);
        }
    }

    async getUserDetailLogin(user_id, login_type, callback){
        console.log("User ID:", user_id);
        console.log("Login Type:", login_type);
        var selectUserQuery;
        if(login_type == "S"){
            selectUserQuery = "SELECT fname from tbl_user where user_id = ?";
        } else{
            selectUserQuery = "SELECT s.name_ from tbl_user u inner join tbl_socials s on s.social_id = u.social_id where u.user_id = ?";
        }
        
        try{

            const [user] = await database.query(selectUserQuery, [user_id])
            console.log("User", user);
            if(user.length > 0){
                return callback(undefined, user[0]);
            }
            else{
                return callback(t('no_data_found'), []);
            }

        } catch(error){

            return callback(error, []);
        }
    }

    async updateUserInfo(user_id, user_data, callback){
            const updateFields = { ...user_data};
            const updateQuery = "UPDATE tbl_user u INNER JOIN tbl_otp o ON u.user_id = o.user_id SET o.verify = 1 WHERE o.otp = ? and u.user_id = ? and o.verify = 0";
            
            try{
                const [updatedUser] = await database.query(updateQuery, [updateFields.otp, user_id]);
                console.log("Updated User:", updatedUser);
                if (updatedUser.affectedRows > 0) {
                    await this.getUserDetail(user_id, user_id, function(err, userInfo) {
                        console.log("UserInfo: ", userInfo);
                        if (err) {
                            console.log(err);
                            return callback(err, null);
                        } else {
                            console.log(userInfo);
                            return callback(null, userInfo);
                        }
                });
                } else {
                    return callback(t('email_already_registered'), null);
                }

            } catch(error){
                return callback(error, null);
            }

    }

    async updateUserInfoGeneral(id, data, callback){
        var updateUserQuery = "UPDATE tbl_user SET ? where user_id = ?";
        try{
            const [result] = database.query(updateUserQuery, [data, id]);
            this.getUserDetail(id, id, (error, result)=>{
                if(error){
                    return callback(error, undefined);
                } else{
                    return callback(undefined, result);
                }
            });

        }catch(error){
            return callback(error, undefined);
        }
    }

    async generate_user_detail(requested_data){
        const data_received = {
            email_id: requested_data.email_id,
            signup_type: requested_data.signup_type
        };

        const optionalFields = ['fname', 'lname', 'mobile_number', 'social_id'];
        optionalFields.forEach(field => {
            if (requested_data[field]) {
                data_received[field] = requested_data[field];
            }
        });

        if (requested_data.passwords) {
            data_received.passwords = md5(requested_data.passwords);
        }

        return data_received;
    }

    async generateDeviceDetails(requested_data){
        return {
            device_type: requested_data.device_type || '',
            device_token: requested_data.device_token || '',
            os_version: requested_data.os_version || '',
            app_version: requested_data.app_version || ''
        };
    }

    async checkExistingUser(data_received){
        data_received = await Promise.resolve(data_received);
        const isStandardSignup = data_received.signup_type === "S";
        
        const selectUserQueryIfExists = isStandardSignup
            ? "SELECT * FROM tbl_user WHERE email_id = ? OR mobile_number = ?"
            : "SELECT * FROM tbl_user WHERE email_id = ? OR social_id = ?";

        const params = isStandardSignup
            ? [data_received.email_id, data_received.mobile_number || null]
            : [data_received.email_id, data_received.social_id];

        const [existingUsers] = await database.query(selectUserQueryIfExists, params);
        return existingUsers;
    }

    async handleExistingUser(existingUsers, requested_data, callback){
        console.log(existingUsers);
        const user_data_ = existingUsers[0];
        if (existingUsers.length > 1) {
            await database.query(
                "UPDATE tbl_user SET is_deleted = 1 WHERE user_id = ?",
                [existingUsers[1].user_id]
            );
        }

        const otp_obj = requested_data.otp ? { otp: requested_data.otp } : {};

        this.updateUserInfo(user_data_.user_id, otp_obj, (error, updateUser) => {
            if (error) {
                console.log(error);
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: error
                });
            }
            return callback({
                code: response_code.SUCCESS,
                message: t('rest_keywords_success'),
                data: updateUser
            });
        });
    }

    async createNewUser(data_received, device_data, requested_data, callback){
        data_received = await Promise.resolve(data_received);
        device_data = await Promise.resolve(device_data);
        console.log(data_received);
        if (!data_received.social_id && data_received.signup_type === 'S') {
            console.log("here");
        } else{
            const [socialResult] = await database.query(
                "SELECT * FROM tbl_socials WHERE email = ? AND social_id = ?",
                [data_received.email_id, data_received.social_id]
            );

            if (!socialResult.length) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: t('no_data_found')
                });
            }
        }
        const insertUserQuery = "INSERT INTO tbl_user SET ?";
        const insertDeviceQuery = "INSERT INTO tbl_device_info SET ?";
        const [insertResult] = await database.query(insertUserQuery, data_received);
        const userId = insertResult.insertId;
        await this.enterOtp(userId);
        await database.query(insertDeviceQuery, device_data);
        this.getUserDetail(userId, userId, async (err, userInfo) => {
            try {
                if (err) {
                    return callback({
                        code: response_code.OPERATION_FAILED,
                        message: t('some_error_occurred')
                    });
                }

                try{
                    const updateStepQuery = "UPDATE tbl_user SET isstep_ = '1' where user_id = ?";
                    const [res] = await database.query(updateStepQuery, [userId]);
                    console.log(res);

                }  catch(error){
                    console.log(error);
                }
                

                if (userInfo.is_profile_completed === 1) {
                    const userToken = this.generateToken(40);
                    const deviceToken = this.generateToken(40);

                    await Promise.all([
                        database.query("UPDATE tbl_user SET token = ? WHERE user_id = ?", [userToken, userId]),
                        database.query("UPDATE tbl_device_info SET device_token = ? WHERE user_id = ?", [deviceToken, userId])
                    ]);

                    userInfo.token = userToken;
                    userInfo.device_token = deviceToken;

                    return callback({
                        code: response_code.SUCCESS,
                        message: t('success_verification_pending'),
                        data: userInfo
                    });
                } else {
                    return callback({
                        code: response_code.SUCCESS,
                        message: t('success_profile_comp_verify_pending'),
                        data: userInfo
                    });
                }
            } catch (tokenError) {
                return callback({
                    code: response_code.OPERATION_FAILED,
                    message: tokenError
                });
            }
        });

    }

    async enterOtp(user_id){
        const otp = this.generateOtp(4);
        const insertOtpQuery = "INSERT INTO tbl_otp (user_id, otp) VALUES (?, ?)";
        await database.query(insertOtpQuery, [user_id, otp]);
        console.log("OTP sent to user_id:", user_id, "OTP:", otp);
    }

}

module.exports = new common();