const API_KEY = process.env.OPENWEATHER_API_KEY
const GOOGLE_KEY = process.env.GOOGLE_API_KEY;
//express is the framework we're going to use to handle requests
const express = require('express')

//request module is needed to make a request to a web service
const request = require('request')

var router = express.Router()

/**
 * @api {get} /weather Request a list of Phish.net Blogs
 * @apiName GetWeather
 * @apiGroup Weather
 * 
 * @apiHeader {String} authorization JWT provided from Auth get
 * 
 * @apiDescription This end point is a pass through to the OpenWeather API. 
 * 
 */ 
 router.get("/", (req, res) => {
    var lat = 91
    var lon = 181
    var cityName = ""
    // res.type("application/json");
    console.log(JSON.stringify(req.headers));
    //if the request include a zip code
    if (req.headers.zip && req.headers.zip.length === 5){
        var zipcode = req.headers.zip;
        let googleURL = "https://maps.googleapis.com/maps/api/geocode/json?address=zipcode" + zipcode + "&key=" +
        GOOGLE_KEY;
        console.log("googleUrl");

        request(googleURL, function(error, response, body){
            if (error){
                res.send(error);
            }
            else {
                let googleGeo = JSON.parse(body);
                lat = googleGeo.results[0].geometry.location.lat;
                lon = googleGeo.results[0].geometry.location.lng;
                let locationInfo = googleGeo.results[0].address_components;
                cityName = "Unknown";
                for (let i = 0; i < locationInfo.length; i++) {
                    if (locationInfo[i].types.includes("locality") ||
                        locationInfo[i].types.includes("sublocality") ||
                        locationInfo[i].types.includes("sublocality_level_1")) {
                        cityName = locationInfo[i].short_name;
                        break;
                    }
                }
                requestWeatherData(res, lat, lon, zipcode, cityName);
            }
        })
    }

    //if request contains lon and lat
    else if (req.headers.latitude && req.headers.longitude) {
        let coords = req.headers.latitude + "," + req.headers.longitude;
        lat = req.headers.latitude;
        lon = req.headers.longitude;
        let googleUrl = "https://maps.googleapis.com/maps/api/geocode/json?latlng=" + coords + "&key=" +
        GOOGLE_KEY;
        console.log("googleUrl");
        request(googleUrl, function (error, response, body) {
            if (error) {
                res.send(error);
            } else {
                let zip = "N/A";
                let cityName = "Unknown";
                let locationInfo = JSON.parse(body).results[0].address_components;
                for (let i = 0; i < locationInfo.length; i++) {
                    if (locationInfo[i].types.includes("locality") ||
                        locationInfo[i].types.includes("sublocality") ||
                        locationInfo[i].types.includes("sublocality_level_1")) {
                        cityName = locationInfo[i].short_name;
                    }
                    if (locationInfo[i].types.includes("postal_code")) {
                        zip = locationInfo[i].short_name;
                    }
                }
                requestWeatherData(res, lat, lon, zip, cityName);
            }
        })
    }
    else{
        res.status(400).send({
            message: "Missing required location info!"
        });
    }
})

function requestWeatherData(res, lat, lon, zip, cityName){
    let url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely&units=imperial&appid=${API_KEY}`

    let currentData = {};
    let hourData = {
    data: []
    };
    let dayData = {
    data: []
    };

    request(url, function (error, response, body) {
        if (error) {
            res.send(error);
        } else {
            let newBody = JSON.parse(body);
            let current = newBody.current;
            let daily = newBody.daily;
            let hourly = newBody.hourly;

            currentData.temp = current.temp;
            currentData.weather = current.weather[0].main;
            currentData.icon = current.weather[0].icon;

            for (let i = 0; i < 24; i++) {
                let newEntry = {};
                newEntry.temp = hourly[i].temp;
                newEntry.weather = hourly[i].weather[0].main;
                newEntry.icon = hourly[i].weather[0].icon;
                hourData.data.push(newEntry);
            }
            for (let i = 0; i < 6; i++) {
                let dayEntry = {};
                dayEntry.tempMin = daily[i].temp.min;
                dayEntry.tempMax = daily[i].temp.max;
                dayEntry.weather = daily[i].weather[0].main;
                dayEntry.icon = daily[i].weather[0].icon;
                dayData.data.push(dayEntry);
            }
            res.status(200).send({
                location: {
                    zip: zip,
                    city: cityName,
                    latitude: lat,
                    longitude: lon
                },
                current: currentData,
                hourly: hourData,
                daily: dayData
            });
        }
    });
}

module.exports = router
