const rules = {
    signup: {
        email_id: "required|email",
        mobile_number: "required_without:social_id|string|min:10|regex:/^[0-9]+$/|max:10",
        passwords: "sometimes|required_without:social_id|min:8",
        signup_type: "required",
        social_id: "required_without:passwords,mobile_number"
    },

    login: {
        email_id: "required|email",
        login_type: "required",
        social_id: "nullable|string",
        passwords: "sometimes|required_without:social_id|min:8"
    },

    verifyOTP:{
        email_id: "required|email",
        otp: "required|min:4|max:4"
    },

    resendOTP:{
        email_id: "required|email"
    },

    forgot_password:{
        email_id: "nullable|required_without:mobile_number|email",
        mobile_number: "nullable|required_without:email_id|string|min:10|regex:/^[0-9]+$/|max:10",
    },

    reset_password: {
        reset_token: "required|min:10|max:10",
        new_password: "required|min:8"
    },

    complete_profile: {
        fname: "required",
        lname: "required",
        address: "required",
        date_of_birth: "required",
        gender: "required"
    },

    changePassword: {
        old_password: "required|min:8",
        new_password: "required|min:8"
    }
}

module.exports = rules;