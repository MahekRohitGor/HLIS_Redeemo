const auth = require("../controllers/auth");

const user = (app) =>{
        app.post("/v1/user/signup", auth.signup);
        app.post("/v1/user/login", auth.login);
        app.post("/v1/user/verifyOtp", auth.verifyOtp);
        app.post("/v1/user/resendOTP", auth.resendOTP);
        app.post("/v1/user/forgotPassword", auth.forgotPassword);
        app.post("/v1/user/resetPassword", auth.resetPassword);
        app.post("/v1/user/completeProfile", auth.completeProfile);
        app.post("/v1/user/category-listing", auth.category_listing);
        app.post("/v1/user/service-listing", auth.service_listing);
        app.post("/v1/user/list-service-provier/:id", auth.list_service_provider);
        app.post("/v1/user/redeem-voucher", auth.redeem_vouchers);
        app.post("/v1/user/list-favs", auth.list_user_favs);
        app.post("/v1/user/list-notification", auth.list_notification);
        app.post("/v1/user/change-password", auth.change_password);
        app.post("/v1/user/edit-profile", auth.edit_profile);
        app.post("/v1/user/logout", auth.logout);
        app.post("/v1/user/delete-account", auth.delete_account);
        app.post("/v1/user/list-plans", auth.list_subs_plans);
        app.post("/v1/user/make-subscription", auth.make_subscription);
        app.post("/v1/user/post-review", auth.post_review);
}

module.exports = user;