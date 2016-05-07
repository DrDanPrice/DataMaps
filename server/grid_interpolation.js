//create Griddata - for each point on the map - basically creates a linear equation at that point, relating it to a set of values
//For weightedistance multiplier - top 50 sites? calculate angle and distance
//for wind, it would be sitewinddir - gridpt2sitedir; then speed is a multiplier? along with inverse distance sq?
//for pollutant, it's the inverse distance squared
//for process, perhaps the ones that will have no values are erased?

//create the grid in one step - and then can have a step that uses it, to populate according to the values that change according to the site values


//create wind system for that grid (could use different pipeline for more wind stations, later)
//   gets avg of speed and angle of wind for that time, not using tail, etc. - incorporated in gas step
//calculate pollutant/gas value using inverse square weighting, and weight for wind

//http://www.environmentaljournal.org/1-3/ujert-1-3-10.pdf --inverse distance weighting better than ordinary kriging
//http://capita.wustl.edu/capita/capitareports/mappingairquality/mappingaqi.pdf -- for clustering of dense urban sites in bigger steps
//http://www.irceline.be/~celinair/rio/rio_corine.pdf using landcover with a kriging system
//https://www3.epa.gov/airtrends/specialstudies/dsisurfaces.pdf --2004, mostly kriging, no idw
//http://sites.gsu.edu/jdiem/files/2014/07/EP2002-2fmwe5w.pdf -- argues for linear regression from known sources, and not interpolation


makeBaseGrid = function (bbox){  //bbox is coming in lng/lat
  var begintime = Date.now();
  var sites = Monitors.find(
      {
        loc: {
        $geoWithin: {
          $geometry: {
            type : "Polygon" ,
            coordinates: [ bbox ]
            }
          }
        }
      });
  var topPt = _.min(bbox, function(pt,i){return pt[1]});  //mongo likes long/lat; this is smallest lat
  var leftPt = _.min(bbox, function(pt){return pt[0]});
  var bottomPt = _.max(bbox, function(pt){return pt[1]});
  var rightPt = _.max(bbox, function(pt){return pt[0]});
  //later: check on whether gridstep is valid; if more than one topPt, go left, else start at it?
  //for now, assume it's a square.
  var vertDist = calcDistance(leftPt[0],leftPt[0],topPt[1],bottomPt[1]);
  var firsttime = Date.now();
  var latLngth = calcDistance(leftPt[0],leftPt[0],28.0,27.0);
  var ydist = 1/6378.1;//for one km
  var i10 = 0;
  for (var i = 1; i<vertDist*6378.1; i++){
     if (i10>10){i10=0};
     i10++;
     var lngLngth = calcDistance(leftPt[0],leftPt[0]+1,lat,lat);
     var latlngRatio = latLngth/lngLngth;
     var lat = topPt[1] + i*ydist*(180/Math.PI);
     var beginhoriztime = Date.now();
     var horizDist = calcDistance(leftPt[0],rightPt[0],lat,lat);
     var xdist = ydist * latlngRatio;
     var j10 = 0;
     for (var j = 1; j<horizDist*6378.1*latlngRatio;j++){
       if (j10>10){j10=0};
       j10++;
       lng = leftPt[0] + (j*xdist*180/Math.PI);
       gridPt = {loc:[parseFloat(lng),parseFloat(lat)],latlngRatio:latlngRatio,gridsizex:j10,gridsizey:i10};
       GridPoints.insert(gridPt);
     }
  };
  console.log('makeBaseGrid ended',Date.now()-begintime)//196000 for 30000 pts
  GridPoints._ensureIndex({ loc: '2dsphere' });
  return
};

var radConvert = Math.PI/180;  //does that store it for quicker calculation
//using haversine - http://www.movable-type.co.uk/scripts/latlong.html
var calcDistance = function(lng1,lng2,lat1,lat2){
  var radLat = (lat2-lat1) * radConvert;
  //console.log('latdist',lat1-lat2)
  var radLng = (lng2-lng1) * radConvert;
  //console.log('lngdist',lng1-lng2)
  var a =
    Math.sin(radLat/2) * Math.sin(radLat/2) +
    Math.cos(lat1*radConvert) * Math.cos(lat2*radConvert) *
    Math.sin(radLng/2) * Math.sin(radLng/2)
    ;
  var dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); //
//  var angle = Math.atan2(radLat,radLng);
  return dist;  //multiply by 6,378.1 for km
}
//make these shorter if we want fewer
var AirNowHourlyParamNames = [
  'NO','NO2T','NO2','NO2Y','NOX','NOY','NO3','SO4','SO2','SO2-24HR','SO2T','CO','CO-8HR','COT','EC','OC','BC','UV-AETH','PM25','PM10','OZONE','OZONE-8HR','OZONE-1HR','PM25-24HR','PM10-24HR','TEMP','WS','WD','RHUM','BARPR','SRAD','PRECIP'
];
//will use in UI later
var AirNowHourlyUnits = [
  'ppb','ppb','ppb','ppb','ppb','ppb','μg/m3','μg/m3','ppb','ppb','ppb','ppm','ppm','ppb','μg/m3','μg/m3','μg/m3','μg/m3','μg/m3','μg/m3','ppb','ppb','ppb','μg/m3','μg/m3','oC','m/s','degrees','%','mb','Watts/m2','mm'
]
var AirNowHourlyDescripts = [
  'NO (nitric oxide)',
  'NO2 (nitrogen dioxide), true measure',
  'NO2 computed, NOx-NO',
  'NO2 computed, NOy-NO',
  'NOx (nitrogen oxides)',
  'NOy (total reactive nitrogen)',
  'NO3 ion (nitrate, not adjusted for ammonium ion)',
  'SO4 ion (sulfate, not adjusted for ammonium ion)',
  'SO2 (sulfur dioxide), conventional',
  'SO2 24-hr average (midnight to midnight)',
  'SO2 trace levels',
  'CO (carbon monoxide), conventional',
  'Peak CO 8-hr average (midnight to midnight)',
  'CO trace levels',
  'EC (elemental carbon) – PM2.5',
  'OC (organic carbon, not adjusted for oxygen and hydrogen) – PM2.5',
  'BC (black carbon at 880 nm)',
  'UV-AETH (second channel of Aethalometer at 370 nm)',
  'PM2.5 mass',
  'PM10 mass',
  'Ozone',
  'Peak ozone 8-hr average (midnight to midnight)',
  'Peak ozone 1-hr maximum (midnight to midnight)',
  'PM2.5 mass 24-hr average (midnight to midnight)',
  'PM10 mass 24-hr average (midnight to midnight)',
  'Ambient temperature',
  'Wind speed',
  'Wind direction',
  'Relative humidity',
  'Barometric pressure',
  'Solar radiation',
  'Precipitation'
];

var makeGridatTime = function(bbox,beginepoch,endepoch){
  var begintime = Date.now();
  GridValues.remove({});
  //for each gridpt - numerator = pollutVal/dist + pollutVal2/dist //or dist*dist, for smoothing
  //denominator = 1/dist + 1/dist2 etc. //or dist*dist
  //radial gaussian ??
  //pull values from 6 before beginepoch
  //value = 6*v1+5*v2etc.  /6!

var gridpoints = GridPoints.find(
  {
    loc: {
    $geoWithin: {
      $geometry: {
        type : "Polygon" ,
        coordinates: [ bbox ]
        }
      }
    }
  });
  gridpoints.forEach(function(pt){
    //calculate all inverse distance weighted values
    //AirNow.gov hourly :https://docs.airnowapi.org/docs/HourlyDataFactSheet.pdf
    var IDWeights = {};
    IDWeights['loc'] = pt.loc;
    IDWeights['gridsizex'] = pt.gridsizex;
    IDWeights['gridsizey'] = pt.gridsizey;
    var IDWObj = {};
    //make a function call, so not just AirNow data
    for (var i=0;i<AirNowHourlyParamNames.length;i++){
      IDWObj['IDWnom_'+AirNowHourlyParamNames[i]] = 0;
      IDWObj['IDWdenom_'+AirNowHourlyParamNames[i]] = 0;
      IDWObj['IDWcount_'+AirNowHourlyParamNames[i]] = 0;
    }
    Monitors.aggregate([
     {
     $geoNear: { //$geoNear has to be first in agg pipeline
        near: { type: "Point", coordinates: pt.loc },
        distanceField: "dist", //already in meters
        //distanceMultiplier: 6378.1,
        maxDistance: 30000, //seems to already be in meters, not radians
        //query: { type: "public" },
        //num: 3,
        spherical: true
        }
      },
      {
        $project: {
          _id: 1,
          AQSID: 1,
          hourlyParameters: 1,
          dist: "$dist"//,
          //angle: { $multiply: [ pt.latlngRatio, <expression2>, ... ] }
          //don't have trig in $project, so calculate from pt.loc?
        }
      }
    ],
  Meteor.bindEnvironment(
      function (err, result) {
           _.each(result, function (e) {
             var dist2 = e.dist*e.dist;
             if (e.hourlyParameters){
               _.each(e.hourlyParameters,function(p){
                 var paramname = p['parameter name']
                 if (paramname == 'PM2.5'){paramname = 'PM25'};
                 if (paramname == 'PM2.5-24HR'){paramname = 'PM25-24HR'};
                 IDWObj['IDWnom_'+paramname] += Number(p.value)/dist2;
                 IDWObj['IDWdenom_'+paramname] += Number(1.0)/dist2;
                 IDWObj['IDWcount_'+paramname] += Number(1.0);
               });
            };
           });
           for (key in IDWObj){
             for (ind in AirNowHourlyParamNames){
               var type = AirNowHourlyParamNames[ind];
               if (IDWObj['IDWcount_'+type]>0){
                 IDWeights[type] = (IDWObj['IDWnom_'+type]/IDWObj['IDWcount_'+type]) / (IDWObj['IDWdenom_'+type]/IDWObj['IDWcount_'+type]);
               }
             }
           }
          if(err){
            console.log('error in aggregation at GridPoints: ',err)
          };
          GridValues.insert(IDWeights);
        }
      )
);
});//end of gridpoints.forEach
GridValues._ensureIndex({ loc: '2dsphere' });
console.log('makeGridatTime ended',Date.now()-begintime) //30 seconds doing nothing but finding everything inside 30000
}; //end of makeGridatTime
var boundbox = [
            [
              -95.55084228515625,
              30.28990324883237
            ],
            [
              -95.99029541015625,
              30.085731229616634
            ],
            [
              -95.96282958984375,
              29.11857441491087
            ],
            [
              -95.55084228515625,
              28.703766775462204
            ],
            [
              -94.8175048828125,
              29.243270277106987
            ],
            [
              -94.9822998046875,
              30.166500980766052
            ],
            [
              -95.55084228515625,
              30.28990324883237
            ]
          ];
Meteor.startup(function(){
  if (GridPoints.find().count() == 0){
    //makeBaseGrid([[-94.5,29.0],[-96.5,29.0],[-96.5,31],[-94.5,31.0],[-94.5,29.0]]);
    makeBaseGrid(boundbox);
  }
  //makeGridatTime(boundbox,Date.now(),Date.now()-3000);


});


Meteor.methods({
});

//could have the livewatcher from livefeed call this one, too
