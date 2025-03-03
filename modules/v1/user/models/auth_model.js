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
            login_type: request_data.login_type
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


}

module.exports = new authModel();