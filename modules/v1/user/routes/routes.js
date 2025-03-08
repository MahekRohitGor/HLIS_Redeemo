const auth = require("../controllers/auth");

const user = (app) =>{
        /**
         * @swagger
         * /v1/user/signup:
         *   post:
         *     summary: User Signup
         *     description: Registers a new user with email, password, and mobile number OR register with Social Login.
         *     tags:
         *       - Authentication
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - email_id
         *               - passwords
         *               - mobile_number
         *               - signup_type
         *               - device_type
         *               - signup_type
         *               - device_token
         *               - os_version
         *               - app_version
         *             properties:
         *               email_id:
         *                 type: string
         *                 format: email
         *                 example: "user@example.com"
         *               passwords:
         *                 type: string
         *                 minLength: 8
         *                 example: "StrongP@ss123"
         *               mobile_number:
         *                 type: string
         *                 pattern: "^[0-9]{10}$"
         *                 example: "9876543210"
         *     responses:
         *       1:
         *         description: User successfully registered
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 code:
         *                   type: integer
         *                   example: 1
         *                 message:
         *                   type: string
         *                   example: "success_profile_comp_verify_pending"
         *                 data:
         *                      type: object
         *       0:
         *         description: Validation error
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 code:
         *                   type: integer
         *                   example: 0
         *                 message:
         *                   type: string
         *                   example: "Invalid email format"
         */
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
        app.post("/v1/user/mark-favs", auth.mark_fav);
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