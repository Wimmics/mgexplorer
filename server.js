/**
 * LinkedDataViz
 * Node proxy server
 * Receive query from HTML page, send query to SPARQL endpoint, apply transformation,
 *
 * Yun Tian - Olivier Corby - Marco Winckler - 2019-2020
 * Minh nhat Do - Aline Menin - Maroua Tikat - 2020-2022
**/

const fs = require('fs');
const express = require('express');
const back = require('express-back');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const https = require('https')


const stream = require('stream');


/// custom servertools
const { Data } = require("./servertools/data")
const { Cache } = require("./servertools/cache")
const { Users } = require("./servertools/user")
const utils = require("./servertools/utils");
const { SPARQLRequest } = require('./servertools/sparql');

const users = new Users()
const cache = new Cache()
const data = new Data()
const sparql = new SPARQLRequest()
//////////

const prefix = '/mgexplorer'

const app = express()

app.use(express.json({limit: '50mb'}));

//add other middleware
app.use(cors());
app.use(morgan('dev'));

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: "Your secret key",
    resave: true,
    saveUninitialized: true
}));

app.use(back());

// index page
app.use(prefix + '/mge/', express.static(path.join(__dirname, 'src/mgexplorer')))
app.use(prefix + '/lib/', express.static(path.join(__dirname, 'src/lib')))
app.use(prefix + '/images/', express.static(path.join(__dirname, 'src/images')))
// app.use(prefix + '/js/', express.static(path.join(__dirname, 'src/query/js')))
app.use(prefix + '/css/', express.static(path.join(__dirname, 'src/css')))
app.use(prefix + '/build/', express.static(path.join(__dirname, 'www/build')));
app.use(prefix + '/assets/', express.static(path.join(__dirname, 'www/assets')));

////////////// login routes ///////////////////////////
// TODO: review the login routes once the unified authentification system is in place

app.get(prefix + '/login', function (req, res) {
    res.render('pages/login');
})

app.post(prefix + '/login', async (req, res) => {
    const { email, password} = req.body
    let user = await users.get(email, password);
    if(user){
        req.session.user = user;
        if (req.query.action) { // if the user is trying to log into a ldviz/query/ route such as edit or view, redirect after connection
            res.redirect(prefix + '/query/' + req.query.action + '?queryId=' + req.query.queryId);
        } else if (Object.keys(req.query).length) { // if the user is trying to use any other page with query parameters, reconstruct the parameters and redirect it
            res.redirect(prefix + utils.getQuery(req.query))
        }
        else res.redirect(prefix + '/query'); // assumes that they are login in the /ldviz/query route (it needs to be generalized)
    }
    else {
        res.render('pages/login', { message: "Incorrect email or password" });
    }
})

app.get(prefix + '/logout', (req, res) => {
    if (req.session.user) {
        delete req.session.user;
    }
    res.redirect('/ldviz/query');
})

/////////// end login routes //////////////////////////


// home page
app.get(prefix + '/', function (req, res) {
    res.render("about")
})

// mgexplorer visualization
app.get(prefix + '/dashboard', async function (req, res){

    let result = await data.load(req)
    result.routes = {
        cache: { 
            delete: { route: prefix + "/cache/delete", method: 'POST',  headers: {'Content-Type': 'application/json'}},
            write: { route: prefix + "/cache/write", method: 'POST',  headers: {'Content-Type': 'application/json'}},
            get: { route: prefix + "/cache/get", method: 'POST',  headers: {'Content-Type': 'application/json'}}, 
        },
        sparql: { route: prefix + "/sparql", method: 'POST',  headers: {'Content-Type': 'application/json'}}
    }

    res.render("index", result);
})


/**
 * This route is used by ldviz to save queries for exploration
 * req.body: {query (Query Object)}
 */
app.post(prefix + '/publish', async function (req, res) {

    let response;

    if (req.body.isPublished) {
        response = await data.saveQuery(req.body)
    } else response = await data.deleteQuery(req.body.id)
    
    if (response && response.message) {
        res.sendStatus(500)
        return;
    }

    // delete cache
    await cache.deleteFile(req.body)
    
    res.sendStatus(200);
})


/**
 * This route manages the cached files
 * :action can receive three values:
 * - delete: to delete a file from the cache. req.body: a JSON object containing a query
 * - write: to write a file to the cache. req.body: a JSON array containing the data and a JSON object containing the query
 * - get: retrieve a file from the cache. req.body: a JSON object containing a query
 */
app.post(prefix + '/cache/:action', async function (req, res) {
    
    let result;
    switch(req.params.action) {
        case 'delete':
            result = await cache.deleteFile(req.body)
            break;
        case 'write':
            result = await cache.writeFile(req.body.result, req.body.query)
            break;
        case 'get':
            result = await cache.getFile(req.body)
            if (!result) {
                res.sendStatus(404)
                return
            } else { 
                res.send(result)
                return
            }
    }   
        
    if (result && result.message) {
        res.sendStatus(500)
        return;
    }

    res.sendStatus(200);
})


////////////////////////////////
/// routes for offline data

app.get(prefix + '/apps/:app', async function (req, res){
    //await users.checkConnection(req)
    let result = await data.load(req)
    result.static = true;
    result.app = req.params.app

    result.routes = { 'dataset': { route: prefix + `/apps/${req.params.app}/data/`, method: 'GET' } }

    res.render("index", result);
})

app.get(prefix + "/apps/:app/data/:dataset", async function(req, res) {
    let result = {}

    result.data = JSON.parse(fs.readFileSync(`data/apps/${req.params.app}/${req.params.dataset}`))

    result.stylesheet = JSON.parse(fs.readFileSync(`data/apps/${req.params.app}/config/stylesheet.json`))

    stream.Readable.from(JSON.stringify(result)).pipe(res)
})


//// annotation routes ////////////////////
// TODO: check with Maroua to get the latest version of the annotations

// app.post(prefix + '/saveAnnotation', function (req, res) {
//     var path = "data/annotations/test.json";
//     var data = req.body; // query content
//     utils.update_file(path,data);
//     res.sendStatus(200);
// })


// SPARQL request
app.post(prefix + '/sparql', async function (req, res) {
    res.send(await sparql.sendRequest(req.body.query, req.body.endpoint))
})





const port = 8035 // verify the availability of this port on the server
const portHTTPS = 8036

app.listen(port, async () => { console.log(`HTTP Server started at port ${port}.`) })

try {
    let folderpath = '/etc/httpd/certificate/exp_20250808/'
    var privateKey = fs.readFileSync( folderpath + 'dataviz_i3s_unice_fr.key' );
    var certificate = fs.readFileSync( folderpath + 'dataviz_i3s_unice_fr_cert.crt' );
    var ca = fs.readFileSync( folderpath + 'dataviz_i3s_unice_fr_AC.cer' );
    var options = {key: privateKey, cert: certificate, ca: ca};
    https.createServer( options, function(req,res)
    {
        app.handle( req, res );
    } ).listen( portHTTPS, async () => { console.log(`HTTPS Server started at port ${portHTTPS}.`) } );
} catch(e) {
    console.log("Could not start HTTPS server")
}