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
makeBaseGrid = function (bbox, gridstep){  //bbox is coming in lng/lat
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
      //sites.forEach(function(val,k){logger.info(val)})
  var topPt = _.min(bbox, function(pt,i){return pt[1]});  //mongo likes long/lat; this is smallest lat
  var leftPt = _.min(bbox, function(pt){return pt[0]});
  var bottomPt = _.max(bbox, function(pt){return pt[1]});
  var rightPt = _.max(bbox, function(pt){return pt[0]});
  //later: check on whether gridstep is valid; if more than one topPt, go left, else start at it?
  //for now, assume it's a square.
  var gridPoints = [];
  var horizDist = calcDistance(leftPt[0],rightPt[0],topPt[1],topPt[1]);
  var vertDist = calcDistance(leftPt[0],leftPt[0],topPt[1],bottomPt[1]);
  var horiz = _.range(0,parseFloat(horizDist)*180/Math.PI,parseFloat(gridstep)); //because str
  var vertical = _.range(0,parseFloat(vertDist)*180/Math.PI,parseFloat(gridstep));
  console.log(horiz.length)
  //to do correctly, run each through calcDistance? or make a verticalStep and a horizStep
  vertical.forEach( function(ydist,i){ //distance expressed in latitude line difference
     lat = parseFloat(topPt[1]) + ydist;
     //http://www.etechpulse.com/2014/02/calculate-latitude-and-longitude-based.html
     horiz.forEach( function(xdist,j){
       lng = calcLng(lat,leftPt[0],xdist,ydist); //current lat; original lng; dist
       //console.log('lng should be small increment, after repeated lat',lat,lng)
       gridPt = {loc:{coordinates:[lng,lat]}};
       sites.forEach(function(site,k){
          dist = calcDistance(site.loc.coordinates[0],lng,site.loc.coordinates[1],lat);
          angle = Math.atan2(xdist,ydist)
          gridPt[site._id] = {angle:angle,distance:dist};
        });
        gridPoints.push(gridPt); //or put it in a collection??
     })
  });
  console.log('gridPoints',gridPoints[4]);
  return gridPoints
};

var calcLng = function(lat,origlng,xdist,ydist){
    radLat = lat * radConvert;
    angle = Math.atan2(xdist,ydist);
    radLng = origlng * radConvert;
    newlng = origlng + (Math.atan2(Math.sin(angle)*Math.sin(xdist*radConvert)*Math.cos(radLat),(radLng * radLat) + Math.cos(ydist*radConvert))* (19)); //distance in radians
    console.log(newlng)
    return newlng;//  * (180/Math.PI);
}
var radConvert = Math.PI/180;  //does that store it for quicker calculation
//using haversine
var calcDistance = function(lng1,lng2,lat1,lat2){
  var radLat = (lat1-lat2) * radConvert;
  var radLng = (lng1-lng2) * radConvert;
  var a =
    Math.sin(radLat/2) * Math.sin(radLat/2) +
    Math.cos(lat1*radConvert) * Math.cos(lat2*radConvert) *
    Math.sin(radLng/2) * Math.sin(radLng/2)
    ;
  var dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//  var angle = Math.atan2(radLat,radLng);
  return dist;
}

/*Sites.aggregate(
  {
    loc: {
    $geoWithin: {
      $geometry: {
        type : "Polygon" ,
        coordinates: [ 0,0,100,100 ]
        }
      }
    }
  },
  Meteor.bindEnvironment(
      function (err, result) {
          _.each(result, function (e) {
            logger.info(result)
          } )
        }
      )
)*/
Meteor.startup(function(){makeBaseGrid([[-93,29.0],[-94,29.0],[-94,30],[-93,29.0]],.11)});

//vgl: https://github.com/DataAnalyticsinStudentHands/OldOzoneMap/tree/master/Data%20Interpolation/Java_src
/*var interpolate2grid = function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
    var interp_pipeline = [
        {
            $match: {
                $and: [{
                    site: {
                    	$geoNear: {
                    		near: center,
                        maxDistance: include_distance,
							          distanceField: "distance",
                        //distanceMultiplier: 3963.2, //6,378.1 for km; but maybe use radians???
							          spherical: true
                    	}
                    },
					               epoch: {
						                     $gt: parseInt(startEpoch, 10),
						                     $lt: parseInt(endEpoch, 10)
					                },
				                pollutant: pollutant
			                 ]
            }
        }
	];
  GridData.aggregate(interp_pipeline,
    Meteor.bindEnvironment(
        function (err, result) {
            _.each(result, function (e) {} )
          }
        )
  );

    LiveData.aggregate(interp_pipeline,
        Meteor.bindEnvironment(
            function (err, result) {
                _.each(result, function (e) {
                    let grids = {};
                    let sites = {};
                    //let sites['pollutants'] = {};
                    subObj._id = e.site + '_' + e._id;
                    subObj.site = e.site;
                    subObj.epoch = e._id;
                    var subTypes = e.subTypes;
                    var aggrSubTypes = {}; //hold aggregated data

                    for (var i = 0; i < subTypes.length; i++) {

                    //transform aggregated data to generic data format using subtypes etc.
                    var newaggr = {};
					}
				})
            }),
            function (error) {
                Meteor._debug('error during aggregation: ' + error);
            }
        )
    );
};
*/

Meteor.methods({
    newInterpolation: function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
        logger.info('Helper called interpolate2grid for pollutant at center with distance: ', pollutant, ' start: ', startEpoch, ' end: ', endEpoch, center, include_distance);
        interpolate2grid(center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch);
    }
});

//could have the livewatcher from livefeed call this one, too
