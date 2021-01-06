const express = require("express");
const {google} = require('googleapis');
const puppeteer = require('puppeteer');
const fs = require('fs');


const SCOPES = ['https://www.googleapis.com/auth/admin.directory.user'];


const app = express();

const port = 3000;

app.get('/oauthcontact',(req,res)=>{
    res.send(req.query['code']);
});

app.get('/getAccessToken', async (req,res)=>{
  fs.readFile('credential.json',(err,content)=>{
    if(err) return {message:"Error al cargar archivo de credenciales"}
    const credentials = JSON.parse(content);
    const client_secret = credentials.client_secret;
    const client_id = credentials.client_id;
    const redirect_uris = credentials.redirect_uris;
    const email = credentials.email;
    const password = credentials.password;
    const oauth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris);
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });
    return authenticate(authUrl,email,password).then((accessToken)=>{
      oauth2Client.getToken(accessToken, (err, token) => {
        if (err) return console.error('Error retrieving access token', err);
        oauth2Client.credentials = token;
        console.log("Access token enviado")
        res.send({token:token.access_token});
      });
    })
  });
    
});

app.listen(port,()=>{
    console.log(`Servidor correndo en el puerto: ${port}`)
});



async function authenticate(url,email,password){
  console.log("ejecutando scrapping")
  let browser = await puppeteer.launch({args: ['--disable-features=site-per-process','--no-sandbox', 
  '--disable-setuid-sandbox', 
  '--disable-gpu'],headless:true});
  let page = await browser.newPage();
  await page.setViewport({width:1280,height:800});
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36')

  
  console.log(`abriendo pagina ${url}`)
  await page.goto(url);
  await page.waitFor('#identifierId');
  await page.type('#identifierId', email, { delay: 5 })

  await page.click('#identifierNext');
 
  console.log("ingresando email")
  
  
  await page.waitForFunction("document.querySelector('body').innerText.includes('Mostrar contraseña')");
  let passwordInputFlag = await page.evaluate(()=>{
    return document.querySelector('body').innerText.includes('Mostrar contraseña');
  })
  if(passwordInputFlag){
    console.log("ingresando password")
      await page.type('input[name="password"]',password);

        console.log("Contrasenia ingresada")
      await page.waitFor(2000)
      await page.click('div#passwordNext');
      console.log("Click en siguiente")
      
      await page.waitForNavigation();
      let accessToken = await page.evaluate(()=>{
        return document.querySelector('body').innerText;
      });
      if(accessToken!=undefined && accessToken != null)
      {
        console.log("login exitoso")
        await page.close();
        await browser.close()
        return accessToken
      }
    }
}