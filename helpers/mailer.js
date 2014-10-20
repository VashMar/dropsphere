var nodemailer = require('nodemailer');


// create reusable transporter object using SMTP transport
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'admin@dropsphere.com',
        pass: '4dm1ndr0pp3r'
    }
});


exports.welcome = function(email){
	console.log("Welcoming: " + email);

	// setup e-mail data with unicode symbols
	var mailOptions = {
	    from: 'Dropsphere Team <admin@dropshere.com>', // sender address
	    to: email, // list of receivers
	    subject: 'Looks like someone made a good decision', // Subject line
	    text: 'Welcome to dropsphere! We hope it makes your life easier!', // plaintext body
	};


	send(mailOptions);
}

exports.sendReset = function(email, token, ENV){
	console.log("Sending password reset to: " + email);
	var tokenLink;
	if(ENV == "production"){
		tokenLink = "<a href='http://dropsphere.herokuapp.com/resetPass/" + token + "'> Reset Password </a>";
	}else{
		tokenLink = "<a href='http://localhost:3500/resetPass/" + token + "'> Reset Password </a>";	
	}

	var mailOptions = {
	    from: 'Dropsphere Team <vash@dropshere.com>', // sender address
	    to: email, // list of receivers
	    subject: 'Password Reset', // Subject line
	    text: "Forgot your password? I guess you can forget worse things, like maple syrup on your pancakes. You can use the link below to reset it:", // plaintext body
	    html: tokenLink
	};

	send(mailOptions);
}

exports.newRequest = function(email, requester){
	var mailOptions = {
	    from: 'Dropsphere Team <vash@dropshere.com>', // sender address
	    to: email, // list of receivers
	    subject: 'You have a friend request!', // Subject line
	    text: "It looks as though " + requester + " wants to drop stuff to you, do you feel the same way?",
	};

	send(mailOptions);
}

function send(mailOptions){
	// send mail with defined transport object
	transporter.sendMail(mailOptions, function(error, info){
	    if(error){
	        console.log(error);
	    }else{
	        console.log('Message sent: ' + info.response);
	    }
	});
}