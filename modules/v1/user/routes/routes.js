const auth = require("../controllers/auth");

const user = (app) =>{
        app.post("/v1/user/signup", auth.signup);
        app.post("/v1/user/login", auth.login);

}

module.exports = user;