var authModel = require("../models/auth_model");
var common = require("../../../../utilities/common");
const response_code = require("../../../../utilities/response-error-code");
const {default: localizify} = require('localizify');
const validator = require("../../../../middlewares/validator");
const { t } = require('localizify');
const vrules = require("../../../validation-rules");

class User{
    async signup(req,res){
        try{
            var request_data = req.body;
            var rules = vrules.signup;
            console.log(rules);
            var message = {
                required: t('required'),
                email: t('email'),
                'mobile_number.min': t('mobile_number_min'),
                'mobile_number.regex': t('mobile_number_numeric'),
                'passwords.min': t('passwords_min')
            }
            var keywords = {
                'email_id': t('rest_keywords_email_id'),
                'passwords': t('rest_keywords_password')
            }

            const isValid = await validator.checkValidationRules(req, res, request_data, rules, message, keywords);
            if (!isValid) return;
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
            var user = req.user;
            authModel.service_listing(request_data, user_id, user, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async list_service_provider(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            var sp_id = req.params.id;
            var user = req.user;
            authModel.list_service_provider(request_data, user_id, user, sp_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async redeem_vouchers(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.redeem_vouchers(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async list_user_favs(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.list_user_favs(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async list_notification(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.list_notification(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async change_password(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.change_password(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async edit_profile(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.edit_profile(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async logout(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.logout(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async delete_account(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.delete_account(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async list_subs_plans(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.list_subs_plans(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async make_subscription(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.make_subscription(request_data, user_id, (_response_data)=>{
                common.response(res, _response_data);
            });

        } catch(error){
            return common.response(res, {
                code: response_code.OPERATION_FAILED,
                message: "Something Went Wrong"
            });
        }
    }

    async post_review(req,res){
        try{
            var request_data = req.body;
            var user_id = req.user_id;
            authModel.post_review(request_data, user_id, (_response_data)=>{
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