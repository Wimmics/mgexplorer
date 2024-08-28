
const fetch = require('node-fetch')

class SPARQLRequest{
    constructor() {

    }

    prepare(query) {
        query = encodeURIComponent(query);
        query = query.replace(/\%20/g, "+");
        query = query.replace(/\(/g, "%28");
        query = query.replace(/\)/g, "%29");
        return query;
    }
    
    async sendRequest(query, endpoint){
        let url = endpoint + "?query=" + this.prepare(query); 
        console.log(url)

        try {
            let response = await fetch(url, { 
                method: 'GET',  
                headers: { 'Accept': "application/sparql-results+json" } 
            })

            if (response.ok) {
                try {
                    return await response.json();
                } catch (e) {
                    return { message: "An error occurred while processing the response.\nPlease try again later." }
                }
            } else return { message: `Request failed with status: ${response.statusText}.\nPlease try again later.`}

        } catch(error) { // network error
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                return { message: 'Network error: Failed to fetch the resource.\nCheck the browser console for more information.' }
            } else {
                return { message: `An error occurred: ${error.message}` }
            }
        }
    }

}

module.exports = { SPARQLRequest: SPARQLRequest }