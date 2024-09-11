const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const pdf = require('html-pdf'); // Ensure html-pdf is installed: npm install html-pdf
const app = express();

const subjects = [
    "📦 Order Confirmation: Your Purchase Has Been Received",
    "🧾 Invoice Details: Thank You for Your Payment",
    "📝 Receipt for Your Recent Transaction",
    "🚚 Order Update: Payment Received Successfully",
    "🙏 Thank You for Your Order: Payment Processed",
    "💳 Purchase Receipt: Order Completed",
    "✅ Transaction Success: Your Payment Confirmation",
    "📬 Order Processed: Payment Received",
    "🛒 Thank You for Shopping with Us: Payment Confirmed",
    "💰 Your Order Has Been Successfully Paid"
];

const from = [
    "Order Confirmation Team", "Customer Service", "Billing Support", "Sales Confirmation",
    "Shipping Notifications", "Order Processing", "Customer Assistance", "Billing Alerts",
    "Sales Support", "Order Fulfillment", "Customer Notifications", "Billing Team",
    "Shipping Department", "Support Team", "Order Updates", "Customer Care Team",
    "Order Assistance", "Billing Confirmation", "Sales Department", "Order Information",
    "Customer Relations", "Billing Operations", "Sales Notifications", "Shipping Info"
];

const bodies = [
    "🛍️ Your purchase was successful! Check the attached document for details.",
"📄 Your payment is confirmed. Find your receipt in the attachment.",
"🚀 Your order is being processed! Review the attached file for your order details.",
"📦 Your package is on the way! Download the attached file for shipping info.",
"📝 Thank you for your business! Your invoice is attached for your records.",
"🎉 Your order is confirmed! The attached document has all the details.",
"📑 Payment received! Please see the attached document for transaction details.",
"🔍 Your order information is attached. Thank you for choosing us!",
"📧 Your order summary is ready! Please review the attached document.",
"🛒 We appreciate your order! The attached file contains your order confirmation."
];

const sendersFilePath = path.join(__dirname, 'senders.csv');
const receiversFilePath = path.join(__dirname, 'receivers.csv');
const htmlTemplates = [path.join(__dirname, 'templates/Paypal.html')]; // Add more templates as needed
const senders = [];
const receivers = [];

// Load senders from CSV file
function loadSenders() {
    return new Promise((resolve, reject) => {
        fs.createReadStream(sendersFilePath)
            .pipe(csv())
            .on('data', (row) => senders.push(row))
            .on('end', () => resolve())
            .on('error', (error) => reject(`Error loading senders: ${error.message}`));
    });
}

// Load receivers from CSV file
function loadReceivers() {
    return new Promise((resolve, reject) => {
        fs.createReadStream(receiversFilePath)
            .pipe(csv(['email']))
            .on('data', (row) => {
                if (row.email) receivers.push({ email: row.email.trim() });
            })
            .on('end', () => resolve())
            .on('error', (error) => reject(`Error loading receivers: ${error.message}`));
    });
}

// Utility function to get a random element from an array
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Function to replace placeholders in the HTML template
function replacePlaceholders(htmlContent) {
    return htmlContent
        .replace(/############/g, '+91 9903198888')
        .replace(/##########/g, 'INV-1234567890');
}

// Function to convert HTML to PDF using html-pdf and save it to the specified output path
function convertHtmlToPdf(htmlContent, outputPath) {
    return new Promise((resolve, reject) => {
        const options = { format: 'A4' }; // Options for the PDF format
        pdf.create(htmlContent, options).toFile(outputPath, (err, res) => {
            if (err) {
                reject(err);
            } else {
                resolve(res.filename);
            }
        });
    });
}

// Function to send emails with PDF attachments
async function sendEmails() {
    for (const receiver of receivers) {
        const sender = getRandomElement(senders);
        const transporter = nodemailer.createTransport({
            service: 'gmail', // Adjust the service based on the sender email provider
            auth: {
                user: sender.email,
                pass: sender.password
            }
        });

        // Read and replace placeholders in the HTML template before converting to PDF
        const htmlContent = fs.readFileSync(getRandomElement(htmlTemplates), 'utf-8');
        const updatedHtmlContent = replacePlaceholders(htmlContent);

        // Generate a random string for the PDF file name
        const randomString = Math.random().toString(36).replace(/[^a-z]+/g, '').slice(0, 8);
        const fileName = `Bill-${randomString}.pdf`; // Properly formatted filename
        const pdfPath = path.join(__dirname, fileName); // Ensure the path uses the actual filename

        try {
            // Convert HTML content to a PDF and save it to the specified path
            await convertHtmlToPdf(updatedHtmlContent, pdfPath);

            const mailOptions = {
                from: `"${getRandomElement(from)}" <${sender.email}>`,
                to: receiver.email,
                subject: getRandomElement(subjects),
                text: getRandomElement(bodies), // Random body text for the email
                attachments: [{ filename: fileName, path: pdfPath }] // Attach the generated PDF
            };

            // Send the email with the generated PDF attachment
            await transporter.sendMail(mailOptions);
            console.log(`Email sent from ${sender.email} to ${receiver.email} with attachment: ${fileName}`);
        } catch (error) {
            console.error(`Error sending email from ${sender.email} to ${receiver.email}:`, error.message);
        } finally {
            // Clean up the generated PDF file after sending the email
            if (fs.existsSync(pdfPath)) {
                try {
                    fs.unlinkSync(pdfPath);
                    console.log(`Cleaned up the file: ${fileName}`);
                } catch (cleanupError) {
                    console.error(`Error cleaning up file ${fileName}:`, cleanupError.message);
                }
            }
        }
    }
}

// Load data and start the email sending process
(async () => {
    try {
        await loadSenders();
        await loadReceivers();
        await sendEmails();
    } catch (error) {
        console.error('Error initializing email process:', error.message);
    }
})();

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
