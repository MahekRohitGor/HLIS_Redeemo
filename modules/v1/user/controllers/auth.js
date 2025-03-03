var authModel = require("../models/auth_model");
var common = require("../../../../utilities/common");
const response_code = require("../../../../utilities/response-error-code");
const {default: localizify} = require('localizify');
const validator = require("../../../../middlewares/validator");
const { t } = require('localizify');

class User{
    async signup(req,res){
        try{
            console.log(req);
            var request_data = req.body;
            authModel.signup(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async login(req,res){
        try{
            var request_data = req.body;
            authModel.login(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async verifyOtp(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            console.log(user_id);
            authModel.verifyOtp(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async resendOTP(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            console.log(user_id);
            authModel.resendOTP(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }
    
    async forgotPassword(req,res){
        try{
            var request_data = req.body;
            authModel.forgotPassword(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async resetPassword(req,res){
        try{
            var request_data = req.body;
            authModel.resetPassword(request_data, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async completeProfile(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.completeProfile(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async category_listing(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.category_listing(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async service_listing(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.service_listing(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

}

module.exports = new User();