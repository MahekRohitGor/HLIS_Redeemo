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

}

module.exports = user;