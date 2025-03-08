const express = require("express");
const app = express();
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const path = require("path");
const common = require("./utilities/common");
const constant = require("./config/constants");
const app_routing = require("./modules/app-routing");
const validator = require("./middlewares/validator");
const headerAuth = require("./middlewares/header-auth");

require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(validator.extractHeaderLang);
// app.use(headerAuth.validateHeader);
// app.use(headerAuth.header);

// Swagger Configuration
const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "User Authentication API",
        version: "1.0.0",
        description: "API documentation for user signup",
      },
      servers: [
        {
          url: "http://localhost:5000",
          description: "Local Server",
        },
      ],
    },
    apis: ["./modules/v1/user/routes/*.js"],
  };

  
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/v1/user/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app_routing.v1(app);

app.listen(process.env.PORT | 5000, () => {
    console.log(`Server started on: http://localhost:${process.env.PORT}`);
});