const fs = require('fs');
const path = require('path');
const csv = require('csvtojson');

class Data{
    constructor() {
        this.folder = '../data/'

        this.filename = {
            'queries': this.folder + 'queries.json',
            'params': this.folder + 'parameters.json',
            'appFolder': this.folder + '/apps/:app/',
            'appConfig': this.folder + '/apps/:app/config/:filename'
        }
    }    


    async readFile(filename) {
        let filepath = path.join(__dirname, filename)
        if (fs.existsSync(filepath)) {
            let rawdata = fs.readFileSync(filepath);
            return JSON.parse(rawdata)
        }
        return []
    }

    async writeFile(filename, json) {
        let filepath = path.join(__dirname, filename)
        fs.writeFile(filepath, JSON.stringify(json, undefined, 4), function (err) {
            if (err) {
                return { message: "Error while writing file " + filepath + " - " + err, code: 500 }
            }
        })
    }

    async saveQuery(query) {

        let json = await this.readFile(this.filename.queries) 
        json.push(query);

        await this.writeFile(this.filename.queries, json)
    
    }

    async deleteQuery(id) {
        let json = await this.readFile(this.filename.queries)

        // Data file does not exist => nothing to do
        if (!json.length) return;
        
        json = json.filter(d => d.id !== id)
        
        await this.writeFile(this.filename.queries, json)
    }

    // Custom method to load data for custom applications
    async loadFilenames(app) {
        
        let foldername = this.filename.appFolder.replace(":app", app)
       
        let filenames = fs.readdirSync(path.join(__dirname, foldername))

        let result = []

        let files;
        if (['hceres', 'i3s'].includes(app)) {
            let configfile = this.filename.appConfig.replace(":app", app)
            configfile = configfile.replace(":filename", "ID_HAL.csv")
            
            let people = await csv().fromFile(path.join(__dirname, configfile))
            people.forEach(p => {
                if (!p.idHal.length) return;

                files = filenames.filter(f => f.includes(p.idHal))
                
                files.forEach(f => {
                    result.push({
                        name: p.name || `${p.Nom} ${p.Prenom}`,
                        idHal: p.idHal,
                        orcid: p.ORCID,
                        filename: f
                    })
                })
            })

            let total = filenames.filter(f => f.includes("total-"))
            total.forEach(f => {
                result.push({
                    name: app.toUpperCase(),
                    idHal: "",
                    orcid: "",
                    filename: f
                })
            })
        } else {
            files = filenames.filter(d => d.includes('.json'))
            files.forEach(f => {
                result.push({
                    name: app,
                    idHal: null,
                    orcid: null,
                    filename: f
                })
            })
        }

        result.sort( (a,b) => a.name.localeCompare(b.name));

        return result
    }

    async load(req) {
        let queryParams = req.query;    
        let queries = await this.readFile(this.filename.queries)
        let params = await this.readFile(this.filename.params)        

        let filenames;
        if (req.params.app) (
            filenames = await this.loadFilenames(req.params.app)
        )

        return { queryParams: queryParams, 
            queries: queries, 
            params: params,
            filenames: filenames,
            user: req.session.user || null
        }
    }
}



module.exports = { Data: Data }