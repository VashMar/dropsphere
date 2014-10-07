var nodemailer = require('nodemailer');


// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'vash@dropsphere.com',
        pass: 'dr0p_sph3r3'
    }
});


exports.welcome = function(email){
	console.log("Welcoming: " + email);

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: 'Dropsphere Team <vash@dropshere.com>', // sender address
	    to: email, // list of receivers
	    subject: 'Looks like someone made a good decision', // Subject line
	    text: 'Welcome to dropsphere! We hope it makes your life easier!', // plaintext body
	};


	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        console.log(error);
	    }else{
	        console.log('Message sent: ' + info.response);
	    }
	});
}