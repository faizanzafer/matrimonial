const otpTemplate = (random) => {
    return `<!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP</title>

        <style>
            .prg {
                font-size: 16px;
                font-family: 'Times New Roman', Times, serif;
                font-weight: 500;
                margin: 10px;
            }

            .otp {
                font-size: 30px;
                font-family: 'Times New Roman', Times, serif;
                font-weight: bold;
                font-style: oblique;
                margin: 10px;
            }
        </style>
    </head>

    <body>
    <div style="background-color: #dc4fff; color: white;text-align: center;border-radius: 10px; padding-top:20px;">
        <p class="prg">Hello, Dear User Welcome to Pak shadi your OTP code is (<strong class="otp">${random} </strong>). Which is valid only for 2 minutes.
        In Order to verify your Email please use the OTP code above, Thank you and welcome to Pak shadi where you will find Thousands of peoples who are looking for their life partner.<br>
        Contact us:
        </p>
        </div>
    </body>

    </html>`
}


module.exports = { otpTemplate }