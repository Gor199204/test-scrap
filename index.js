const cheerio = require('cheerio');
const fs = require('fs');
const axios = require('axios');

const soccerCompetitions = axios.get('https://www.espn.com/soccer/competitions');
const soccerTable = axios.get('https://www.espn.com/soccer/table/_/league/esp.1');
const scheduleTable = axios.get('https://www.espn.com/soccer/fixtures/_/league/esp.1');
const getScheduleLocation = (link) => axios.get(`https://www.espn.com${link}`);
const regions = {}
const competition = {}
let tableName;

//INFO: 
// [
//     {
//         team1Name: "",
//         team2Name: "",
//         matchName: team1Name + "vs" +team2Name,
//         startDate: momentTime || iso(amsativ + jam),
//         location: "camp now"
//     }
// ]




/**
 * INFO: Competitions
 */

const fetchByOrder = async() => {
     await soccerCompetitions.then(async res => {
        const $ = await cheerio.load(res.data);
        await $('.layout__column--1 > .Wrapper').find('h3').each((i, elem) => {
            regions[$(elem).text()] = {};
    //         // console.log("elements", $(elem).text());
    //         // console.log("Competition: ", competition);
    //         // console.log("Competition: ",111, competition);
    //         // console.log("Region: ",111, regions);      
            
        });
        fs.writeFile('./competition.json', JSON.stringify(regions), function (err) {
            if (err) throw err
            console.log('Saved competition.json file');
        })
       
    
    })
    
    await soccerCompetitions.then(res => getLeages('./competition.json', '#Europe', res.data))
    await soccerTable.then(res => getLeagueTable('./competition.json', 'Europe', res.data));
    await scheduleTable.then(res => getScheduleTable('./competition.json', 'Europe', res.data));
}

fetchByOrder();


async function getLeages(filePath, regionXPath, data) {
    const $ = await cheerio.load(data);
    fs.readFile(filePath, async(err, objReg) => {
        // const str = await JSON.stringify(objReg);
        const json = await JSON.parse(objReg);
        const key = $(regionXPath).text();

        $(regionXPath + '+.layout h2').each((i, elem) => {
            json[key][$(elem).text()] = {};
        });

        fs.writeFile('./competition.json', JSON.stringify(json), err => {
            if(err) throw err
            console.log('Get competitions data: Done');
        });

    })
}

// /**
//  * INFO: Get Liga table data
//  */

async function getLeagueTable(filePath, regionXPath, data) {
    const $ = await cheerio.load(data);
    tableName = $(".Table__Title").text();
        fs.readFile(filePath, async(err, objNames) => {
            const json = await JSON.parse(objNames);
            console.log('Here : >>>> ', json, regionXPath, tableName)
            json[regionXPath][tableName] = {
                ...json[regionXPath][tableName],
                "Table": [],
                "Schedule": []
            }
            $('.Table').find('.Table__TR .hide-mobile ').each((i, elem) => {   
            json[regionXPath][tableName]["Table"].push({
                name: $(elem).text()
            });
        });    
            json[regionXPath][tableName]["Table"] = json[regionXPath][tableName]["Table"].map((element, index) => {
                    return ({ 
                        ...element,
                        index: index + 1,
                        GP: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 0).text(),
                        W: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 1).text(),
                        D: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 2).text(),
                        L: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 3).text(),
                        F: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 4).text(),
                        A: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 5).text(),
                        GD: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 6).text(),
                        P: $(`.Table__TBODY .Table__TR:nth-child(${index + 1})`).find('td > span').filter((i) =>  i == 7).text(),
                    });
        });
        fs.writeFile('./competition.json', JSON.stringify(json), err => {
            if(err) throw err;
            console.log('Get liga table data: Done');
        });
    })
}



// /**
//  * INFO: Get schedule data
//  */

const getFullScheduleData = (link) => {
    const getScheduleData = async(fileXPath, region, data) => {
        const $ = await cheerio.load(data);
        return {
            venue: $('.venue').text().replace('\n\t\t\t\t\t\t\t', '').replace('\t\t\t\t\t\t\t', '').replace('VENUE', '').replace('\t:', '').replace('\n', '').trim(),
            time: $('.subdued > div > span').attr('data-date')
        }
    }

    return getScheduleLocation(link)
        .then(res => {
            return getScheduleData('./competition.json', 'Europe', res.data);
        });
}


const getScheduleTable = async(filePath, regionXPath, data) => {
    const $ = await cheerio.load(data);
    let TR_CONTAINER = [];
    let teamsResult = [];
    $('.table-caption').each(async(i, el) => { // returns the date
        $(`tbody:nth-child(${ i + 1}) tr td a span`).each((i, row) => {
//
            let text = $(row).text().split('');
            if(text?.length == 1) text = text.filter(el => el !== 'v');
            const joinedText = text.join("");
            TR_CONTAINER.push(joinedText);
        });

        TR_CONTAINER = TR_CONTAINER.filter(el => el);

        const sortTeams = (array) => {
            if(!array.length) return;
            teamsResult.push({
                team1Name: array[0],
                team2Name: array[1],
                matchName: `${array[0]} vs ${array[1]}`
            });
            array.splice(0, 2);
            sortTeams(array);
        }
        
        
        sortTeams(TR_CONTAINER);
        const linksArray = [];

        $(`tbody tr td[data-behavior="date_time"] a`).each((i, el) => {
            linksArray.push($(el).attr('href'));
        });

        teamsResult = await Promise.all(teamsResult.map(async(res, i) => {
            return getFullScheduleData(linksArray[i])
                .then(response => {
                    const { venue, time } = response;
                    return ({
                        ...res,
                        venue,
                        time
                    });
                });
        }));
        fs.readFile(filePath, async(err, objReg) => {
            const json = await JSON.parse(objReg);    
            json[regionXPath][tableName] = {
                ...json[regionXPath][tableName],
                "Schedule": teamsResult
            }
            fs.writeFile('competition.json', JSON.stringify(json), err => {
                if(err) throw err
                console.log('Get schedule data: Done');
            });
    
        })
    });
}







// soccerCompetitions.then(res => {
//     const $ = cheerio.load(res.data);
//     $('.Wrapper > :nth-child(3) > :nth-child(2)').find('h2').each((i, elem) => {
//         // console.log($(elem).text());
//         competition[$(elem).text()]
//     })
// })





// let teams = [];

// axios.get('https://www.espn.com/soccer/teams/_/league/esp.1')
//     .then(res => {
//        const $ = cheerio.load(res.data);
//         console.log('here');
//        $('.Wrapper > .layout').find('h2.di').each((i, el) => {
//            const title = $(el).text() + " ";
//            teams.push(title);
//        });
//         console.log(teams);
//     });

// const result = {};
// let laligaName;
          
//           axios.get('https://www.espn.com/soccer/competitions')
//               .then(res => {
//                   const $ = cheerio.load(res.data);
//                   $('.headline__h3').each((e, el) => {
//                       result[$(el).text()] = {}
//                       console.log(result)
//                   });
//                   laligaName = $(':nth-child(2) > .ContentList > :nth-child(4) > .mt3 > .TeamLinks > .pl3 > [href="http://www.espn.com/soccer/league/_/name/esp.1"] > .di').text();
//                   console.log('Liga name: ', laligaName);
//                   result["Europe"][laligaName] = [];
//                   console.log('Result: ', result);
//               }).then(() => {
//               axios.get('https://www.espn.com/soccer/schedule/_/league/esp.1')
//                   .then(res => {
//                       const $ = cheerio.load(res.data);
//                       console.log('Laliga:', laligaName);
          
//                       for(let i = 2; i <= 6; i += 2) {
//                           const matchDate = $(`#sched-container > :nth-child(${i})`).text();
//                           result["Europe"][laligaName].push({
//                               matchDate
//                           })
//                       }
          
//                       for (let i = 3; i <= 7; i += 2) {
//                           $(`:nth-child(${i}) > .schedule > tbody`).each((i, tr) => {
//                               $('tr').each((i, td) => {
//                                   const tdName = $('td .team-name').text();
//                                   console.log('Td name: ', tdName)
//                               })
//                           })
//                       }
//                       console.log('Res: ', JSON.stringify(result));
//                   })          
//           })

// let teams = [];

// axios.get('https://www.espn.com/soccer/teams/_/league/esp.1')
//     .then(res => {
//        const $ = cheerio.load(res.data);
//         console.log('here');
//        $('.Wrapper > .layout').find('h2.di').each((i, el) => {
//            const title = $(el).text() + " ";
//            teams.push(title);
//        });
//         console.log(teams);
//     });


