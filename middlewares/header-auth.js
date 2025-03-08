const {default: localizify} = require('localizify');
const database = require("../config/database");
const { t } = require('localizify');
const common = require("../utilities/common");
const response_code = require("../utilities/response-error-code");
const en = require("../language/en");
const fr = require("../language/fr");
const guj = require("../language/guj");
const lodash = require('lodash');

class headerAuth{

    validateHeader(req,res,next){
        var api_key = (req.headers['api-key'] != undefined && req.headers['api-key'] != "" ? req.headers['api-key'] : '');
        if(api_key != ""){
            try{
                if(api_key === process.env.API_KEY){
                    next();
                } else{
                    const response_data = {
                        code: response_code.UNAUTHORIZED,
                        message: "Invalid API Key"
                    }
                    res.status(401).send(response_data);
                }

            } catch(error){
                    const response_data = {
                        code: response_code.UNAUTHORIZED,
                        message: "Invalid API Key"
                    }
                    res.status(401).send(response_data);
            }
        } else{
            const response_data = {
                code: response_code.UNAUTHORIZED,
                message: "Invalid API Key"
            }
            res.status(401).send(response_data);
        }
    }

    extractMethod(request) {
        var url = request.originalUrl;
        var segment = [];
        url.split("/").forEach((element) => {
            if (!lodash.isEmpty(element)) {
                segment.push(element.trim());
            }
        });
        request.appVersion = segment[0];
        request.requestedModule = segment[1];
        request.requestMethod = segment[segment.length - 1];

        return request;
    }

    async getRequestOwner(token) {
        try {
            console.log("here");
            var selectRequestOwnerQuery = "SELECT * from tbl_user WHERE token = ? and is_deleted = 0 and is_active = 1";
            const [owner] = await database.query(selectRequestOwnerQuery, [token]);
            console.log(owner);
            if (owner.length > 0) {
                return owner[0];
            } else {
                throw new Error("Invalid access token");
            }
        } catch (error) {
            throw error;
        }
    }

    async header(req, res, next) {
        try {
            let headers = req.headers;
            var supported_languages = ["en", "fr", "guj"];
            let lng = (headers["accept-language"] && supported_languages.includes(headers["accept-language"]))
                    ? headers["accept-language"]
                    : "en";

            process.env.LNG = lng;

            localizify
                .add("en", en)
                .add("fr", fr)
                .add("guj", guj);
    
            const byPassApi = ['forgotPassword', 'verifyOtp', 'resendOTP' , 'login', 'signup', 'resetPassword', 'api-docs'];
    
            if (lodash.isEqual(headers["api-key"], process.env.API_KEY)) {
                var headerObj = new headerAuth();
                req = headerObj.extractMethod(req);
    
                if (byPassApi.includes(req.requestMethod)) {
                    return next();
                } else {
                    const token = headers.authorization_token;
                    if (!token) {
                        return res.status(401).json({
                            code: response_code.UNAUTHORIZED,
                            message: "Authorization token is missing"
                        });
                    }

                    try {
                        console.log(token);
                        const user = await headerObj.getRequestOwner(token);
                        console.log(user);
                        req.user_id = user.user_id;
                        req.user = user;
                        console.log("req.user_id set to:", req.user_id);
                        next();
                    } catch (error) {
                        return res.status(401).json({
                            code: response_code.UNAUTHORIZED,
                            message: "Invalid Access Token"
                        });
                    }
                }
            } else {
                return res.status(401).json({
                    code: response_code.UNAUTHORIZED,
                    message: "Invalid API key",
                });
            }
        } catch (error) {
            return res.status(500).json({
                code: response_code.UNAUTHORIZED,
                message: "Internal Server Error",
                data: error.message,
            });
        }
    }

}

module.exports = new headerAuth();