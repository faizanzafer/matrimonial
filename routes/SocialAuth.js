const router = require("express").Router();
const jwt = require("jsonwebtoken");
const trimRequest = require("trim-request");
const fs = require('fs');

const Prisma_Client = require("../_Prisma");
const prisma = Prisma_Client.prismaClient;

const {
    emailValidation,
    socialAuthValidation,
    socialLoginValidation
} = require("./validate");
const {
    getError,
    getSuccess,
    clean,
    timeExpired,
    sendSuccess,
    createToken,
    sendError,
} = require("../helpers");
const { getEnv } = require("../config");

const uploadUserFile = require("../middlewares/FileMulter");
const { uploadFile } = require("../S3_BUCKET/S3-bucket")

const {
    checkUserNameTaken,
    getExistingUserFromEmail,
    getUserfromEmail,
    getUserFromPhone,
    createUser,
    createSocialUser,
} = require("../database_queries/Auth");

const allowed_socials = ["google", "facebook"];

router.post("/social_signup/:service", [uploadUserFile, trimRequest.body], async(req, res) => {
    try {
        const service = req.params["service"];
        const service_allowed = allowed_socials.find((allowed_social) => allowed_social == service);
        if (!service_allowed) {
            deleteUploadedFiles(req)
            return res.status(404).send(getError(`only ${allowed_socials.map((item) =>
                item.toString() )} socials areallowed.`));
        }
        const { error, value } = socialAuthValidation(req.body);
        if (error) {
            deleteUploadedFiles(req)
            return res.status(404).send(getError(error.details[0].message))
        }
        if (req.file_error) {
            deleteUploadedFiles(req);
            return sendError(res, req.file_error);
        }

        // if (req.files.length <= 0) {
        //     return sendError(res, "Please upload atleast one picture.");
        // }

        if (!req.files.file) {
            deleteUploadedFiles(req);
            return sendError(res, "Profile Picture is required.");
        }
        // if (!req.files.file && !req.files.pictures) {
        //     deleteUploadedFiles(req);
        //     return sendError(res, "Profile Picture and Private Pictures are required.");
        // }

        if (!req.files.file || req.files.file.length < 1) {
            deleteUploadedFiles(req);
            return sendError(res, "Please upload Profile Picture.");
        }

        // if (!req.files.pictures || req.files.pictures.length < 1) {
        //     deleteUploadedFiles(req);
        //     return sendError(res, "Please upload atleast one Private Picture.");
        // }

        if (req.files.file.length > 1) {
            deleteUploadedFiles(req);
            return sendError(res, "You can upload only 1 Picture for Profile.");
        }

        // if (req.files.pictures.length > 6) {
        //     deleteUploadedFiles(req);
        //     return sendError(res, "You can upload only 6 Pictures in Private Pictures Section.");
        // }

        const {
            firstname,
            lastname,
            user_name,
            email: _email,
            phone: _phone,
            // password,
            gender: _gender,
            age,
            ziodic_sign: _ziodic_sign,
            education,
            height,
            status: _status,
            body_type: _body_type,
            profession: _profession,
            religion: _religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city: _city,
            country: _country,
            description,
            social_auth_id,
            is_social_login,
        } = value;

        const email = _email.toLowerCase();
        const phone = _phone ? "+" + clean(_phone) : null;
        const gender = _gender.toLowerCase();
        const ziodic_sign = _ziodic_sign.toLowerCase();
        const status = _status.toLowerCase();
        const body_type = _body_type.toLowerCase();
        const profession = _profession.toLowerCase();
        const religion = _religion.toLowerCase();
        const city = _city.toLowerCase();
        const country = _country.toLowerCase();

        const emailExists = await getUserfromEmail(email);
        if (emailExists && emailExists.is_registered == true) {
            deleteUploadedFiles(req);
            return sendError(res, "Email already taken.");
        }

        const userNameExists = await checkUserNameTaken(user_name);
        if (userNameExists) {
            deleteUploadedFiles(req);
            return sendError(res, "User name already taken.");
        }

        if (phone) {
            const phoneExists = await getUserFromPhone(phone);
            if (phoneExists && phoneExists.is_registered == true) {
                deleteUploadedFiles(req);
                return sendError(res, "This phone number is already registered");
            }
        }

        if (!emailExists) {
            deleteUploadedFiles(req);
            return sendError(res, "First verify your email then continue.");
        }

        const newUser = await createSocialUser(
            emailExists,
            firstname,
            lastname,
            user_name,
            email,
            phone,
            // password,
            gender,
            age,
            ziodic_sign,
            education,
            height,
            status,
            body_type,
            profession,
            religion,
            show_profile_picture,
            show_private_picture,
            longitude,
            latitude,
            city,
            country,
            description,
            social_auth_id,
            service,
            is_social_login,
        );

        const profile = []
        for (const picture of req.files.file) {
            if (picture) {
                const { Location: profile_url } = await uploadFile(picture);
                profile.push({
                    profile_picture_url: profile_url,
                });
                if (fs.existsSync(picture.path)) {
                    fs.unlinkSync(picture.path)
                }
            }
        }

        const gallery = [];
        if(req.files.pictures){
        for (const file of req.files.pictures) {
            if (file) {
                const { Location } = await uploadFile(file);
                gallery.push({
                    user_id: newUser.id,
                    picture_url: Location,
                });
                if (fs.existsSync(file.path))
                    fs.unlinkSync(file.path);
            }
        }
    }
        await prisma.userGallery.createMany({
            data: gallery,
        });

        const updatedUser = await prisma.users.update({
            where: {
                id: newUser.id,
            },
            data: {
                profile_picture_url: profile[0].profile_picture_url,
            },
        });

        return sendSuccess(res, createToken(updatedUser));

    } catch (error) {
        deleteUploadedFiles(req)
        if (error && error.message) {
            return res.status(400).send(getError(error.message));
        }
        return res.status(400).send(getError(error));
    }
})

router.post("/social_login/:service", trimRequest.all, async(req, res) => {
    try {
        const service = req.params["service"];
        const service_allowed = allowed_socials.find((allowed_social) => allowed_social == service);
        if (!service_allowed) {
            return res.status(404).send(getError(`only ${allowed_socials.map((item) =>
                item.toString() )} socials areallowed.`));
        }
        const { value, error } = socialLoginValidation(req.body);
        if (error) {
            return res.status(400).send(getError(error.details[0].message));
        }
        const { email, social_auth_id } = value;
        // const user = await getExistingUserFromEmail(email);
        const user = await prisma.users.findFirst({
            where: {
                email,
                social_auth_id,
            }
        })
        if (!user) {
            return res.status(400).send(getError("Invalid login credentials."));
        }

        return res.status(200).send(getSuccess(createToken(user)))
            // jwt.sign({
            //         _id: user.id,
            //         name: user.name,
            //         user_name: user.user_name,
            //         email: user.email,
            //         phone: user.phone,
            //     },
            //     getEnv("JWT_SECERET"),
            //     function(err, token) {
            //         if (token)
            //             return res.header("authorization", token).send(getSuccess(token));
            //         return res.status(400).send(getError(err));
            //     }
            // );

    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
});

module.exports = router;

function tokenAuth(req, res, next) {
    try {
        const token = req.header("Authorization");
        if (!token) {
            return res.status(403).send(getError("Access Denied!"));
        }
        const jwtid = getEnv("SOCIAL_JWT_ID");

        const verified = jwt.verify(
            token,
            getEnv("SOCIAL_JWT_SECERET") + getEnv("JWT_SECERET"), {
                subject: "GIVIT",
                jwtid,
            }
        );

        if (!verified)
            return res.status(403).send(getError("Unauthorized api call"));
        req.user = verified;
        next();
    } catch (catchError) {
        if (catchError && catchError.message) {
            return res.status(400).send(getError(catchError.message));
        }
        return res.status(400).send(getError(catchError));
    }
}

function deleteUploadedFiles(req) {
    try {
        // req
        // //    ?
        //     req.files.pictures ?
        //     req.files.pictures.forEach((file) => {
        //         // console.log(file);
        //         fs.unlinkSync(file.path);
        //     }) :
        //     null :
        //     null;

        if (req && req.files) {
            if (req.files.pictures && req.files.pictures.length > 0) {
                req.files.pictures.forEach(picture => {
                    if (fs.existsSync(picture.path))
                        fs.unlinkSync(picture.path)
                })
            }
            if (req.files.file && req.files.file.length > 0) {
                req.files.file.forEach(file => {
                    if (fs.existsSync(file.path))
                        fs.unlinkSync(file.path)
                })
            }
        }

    } catch (err) {}
}

router.post("/user_social_login/:service", [tokenAuth, trimRequest.all], async(req, res) => {
    try {
        const { value, error } = emailValidation(req.body);
        if (error) return res.status(400).send(getError(error.details[0].message));

        const { email } = value;

        const service = req.params["service"];
        const service_allowed = allowed_socials.find(
            (allowed_social) => allowed_social == service
        );
        if (!service_allowed)
            return res
                .status(404)
                .send(
                    getError(
                        `only ${allowed_socials.map((item) =>
                item.toString()
              )} socials are allowed.`
                    )
                );

        const user = await getExistingUserFromEmail(email);
        if (!user)
            return res.status(400).send(getError("Invalid login credentials."));

        jwt.sign({
                _id: user.id,
                name: user.name,
                user_name: user.user_name,
                email: user.email,
                phone: user.phone,
            },
            getEnv("JWT_SECERET"),
            function(err, token) {
                if (token)
                    return res.header("authorization", token).send(getSuccess(token));
                return res.status(400).send(getError(err));
            }
        );
    } catch (err) {
        if (err && err.message) {
            return res.status(400).send(getError(err.message));
        }
        return res.status(400).send(getError(err));
    }
});

// router.post("/social_signup/:service", trimRequest.all, async (req, res) => {
// const newUser = await prisma.users.create({
//     data: {
//         firstname,
//         lastname,
//         user_name,
//         phone,
//         email,
//         // password: hashPassword,
//         gender,
//         age,
//         ziodic_sign,
//         education,
//         height,
//         status,
//         body_type,
//         profession,
//         religion,
//         show_profile_picture,
//         show_private_picture,
//         longitude,
//         latitude,
//         city,
//         country,
//         is_registered: true,
//         description,
//         social_auth_id,
//         social_auth_provider: service,
//         is_social_login,
//     }
// })
//   const service = req.params["service"];
//   const service_allowed = allowed_socials.find(
//     (allowed_social) => allowed_social == service
//   );
//   if (!service_allowed)
//     return res
//       .status(404)
//       .send(
//         getError(
//           `only ${allowed_socials.map((item) =>
//             item.toString()
//           )} socials are allowed.`
//         )
//       );
//   const { error, value } = socialAuthValidation(req.body);
//   if (error) return res.status(400).send(getError(error.details[0].message));
//   const { social_auth_id, name, user_name, email, phone: _phone } = value;
//   try {
//     const phone = "+" + clean(_phone);
//   if (phone.startsWith("+92")) {
//       if (phone.length != 13)
//         return res
//           .status(400)
//           .send(getError("Phone should be 10 character long."));
//     } else if (phone.startsWith("+234")) {
//       if (phone.length != 14)
//         return res
//           .status(400)
//           .send(getError("Phone should be 10 or 11  character long."));
//     } else
//       return res
//         .status(400)
//         .send(getError("Phone can only starts with +92 or +234."));
//     const phoneExists = await prisma.users.findFirst({
//       where: {
//         phone,
//         is_registered: true,
//       },
//     });
//     if (phoneExists)
//       return res
//         .status(400)
//         .send(getError("This phone number is already registered"));
//     const socialExist = await prisma.users.findFirst({
//       where: {
//         social_auth_provider_user_id: social_auth_id,
//         NOT: { social_auth_provider: "no" },
//       },
//     });
//     if (socialExist) {
//       jwt.sign(
//         {
//           _id: socialExist.id,
//           name,
//           user_name,
//           email,
//           phone,
//         },
//         getEnv("JWT_SECERET"),
//         function (err, token) {
//           if (token)
//             return res
//               .header("authorization", token)
//               .send(getSuccess(token));
//           return res.status(400).send(getError(err));
//         }
//       );
//     }
//     const emailExists = await prisma.users.findFirst({
//       where: {
//         email,
//         is_registered: true,
//         NOT: { social_auth_provider: "no" },
//       },
//     });
//     if (emailExists)
//       return res.status(400).send(getError("Already registered this email."));
//     const newUser = await prisma.users.findFirst({
//       where: {
//         phone,
//         is_registered: false,
//       },
//     });
//     const userNameExists = await checkUserNameTaken(user_name);
//     if (userNameExists)
//       return res.status(400).send(getError("User name already taken."));
//     if (!newUser)
//       return res
//         .status(400)
//         .send(getError("First Verify your phone then continue signup"));
//     await prisma.users.update({
//       where: { id: newUser.id },
//       data: {
//         name,
//         user_name,
//         email,
//         social_auth_provider: service,
//         social_auth_provider_user_id: social_auth_id,
//         is_registered: true,
//       },
//     });
//     jwt.sign(
//       {
//         _id: newUser.id,
//         name,
//         user_name,
//         email,
//         phone,
//       },
//       getEnv("JWT_SECERET"),
//       function (err, token) {
//         if (token)
//           return res.header("authorization", token).send(getSuccess(token));
//         return res.status(400).send(getError(err));
//       }
//     );
//   } catch (err) {
//     if (err && err.message) {
//       return res.status(400).send(getError(err.message));
//     }
//     return res.status(400).send(getError(err));
//   }
// });