'use strict';

const uuid = require('uuid');
const serviceName = 'PDF SERVICE MOCK';
const express = require('express');
const PDFService = require('./backend/pdfservice');
const bodyParser = require('body-parser');
const pug = require('pug');
var path = require('path');

global.appRoot = path.resolve(__dirname);

const app = express();
//app.use(express.static('templates/assets'));

//app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }));
app.use(bodyParser.json({limit: '10mb', extended: true}));
app.use(bodyParser.json());


// SERVICES
app.get("/", (req, res, next) => {
  res.json(serviceName);
});

app.post("/html2pdf", (req, res, next) => {
  
  const jobId = uuid.v4();
  // console.debug(jobId);
  // console.debug('HTML BODY: ', req.body.html);

  var headerTemplate = pug.renderFile('templates/header.pug', {});
  var footerTemplate = pug.renderFile('templates/footer.pug', {});

  console.debug('HEADER ---');
  console.debug(headerTemplate);
  console.debug('FOOTER ---');
  console.debug(footerTemplate);

  if (!req.body.html){
    res.sendStatus(400);
  } else {
    PDFService.instance().html2PDF2(req.body.html, jobId, headerTemplate, footerTemplate).then((pdfBuffer) => {
      console.log('PDFBuffer: ', pdfBuffer);
      res.setHeader('Content-disposition', 'inline; filename="' + jobId + '.pdf"');
      res.setHeader('Content-type', 'application/pdf');
      res.send(pdfBuffer);
    });
  }
});


// START SERVER
app.listen(9999, () => {
 console.log("Server running on port 9999");
});