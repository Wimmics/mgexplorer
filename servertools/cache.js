const fs = require('fs');
const path = require('path');

class Cache{
    constructor() {
        this.datafiletimeout = 1296000000; /// keep files in cache for 15 days

        this.folder = path.join(__dirname, '../data/cache/');
        if (!fs.existsSync(this.folder)){
            fs.mkdirSync(this.folder);
        }
    }

    getFileName(query) {
      
        let filename = query.id
        let params = query.params;

        if (params) {
            if (params.country && params.country.length) {
                filename += '_' + params.country
            } 

            if (params.lab) 
                params.lab.forEach(lab => {
                    if (lab && lab.length) filename += '_' + lab
                })

            if (params.period)
                params.period.forEach(period => {
                    filename += '_' + period
                })

            if (params.value)
                params.value.forEach(d => {
                    if (d && d.length) filename += '_' + d
                })
        }
        
        return this.folder + filename + '.json'
    }

    async getFile(query) {
        let filename = this.getFileName(query)

        if (fs.existsSync(filename)) {
            let rawdata = fs.readFileSync(filename)
            return JSON.parse(rawdata)
        }

        return null
    }

    async writeFile(result, query) {
        let filename = this.getFileName(query)
        fs.writeFileSync(filename, JSON.stringify(result, null, 4), function (err) {
            if (err) {
                return { message: "Error while writing file " + filename + " - " + err }
            }
        })
        return;
    }

    async deleteFile(query) {

        let filename = this.getFileName(query)

        if (fs.existsSync(filename)) {
            fs.unlink(filename, function (err) {
                if (err) {
                    return { message: "Error while deleting file " + filename + " - " + err }
                } 
            })
        }
        return;
    }
}

module.exports = { Cache: Cache }