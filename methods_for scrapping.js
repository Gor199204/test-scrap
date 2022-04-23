soccerCompetitions.then(res => {
    getLeages('./competition.json', '#Europe', res.data);
})
function getLeages(filePath, regionXPath, data) {
    const $ = cheerio.load(data);
    fs.readFile(filePath, (err, objReg) => {
        const json = JSON.parse(objReg);
        const key = $(regionXPath).text();
        $(regionXPath + '+.layout h2').each((i, elem) => {
            json[key][$(elem).text()] = {};
        })
        // console.log(json);
        fs.writeFile('competition.json', JSON.stringify(json), err => {
            if(err) throw err
            console.log('Saved Competetion.json file');
        })
    })
}