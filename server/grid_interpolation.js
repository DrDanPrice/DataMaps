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
  var vgridstep = parseInt(vertDist*6378.1); //get it on the km grid
  var vertical = _.range(0,vertDist,vertDist/vgridstep);
  //to do correctly, run each through calcDistance? or make a verticalStep and a horizStep
  vertical.forEach( function(ydist,i){ //distance expressed in latitude line difference
     lat = topPt[1] + ydist*(180/Math.PI); //both expressed as distance in lat degrees
     var horizDist = calcDistance(leftPt[0],rightPt[0],lat,lat);
     var hgridstep = parseInt(horizDist*6378.1);
     var horiz = _.range(0,horizDist,horizDist/(hgridstep));
     horiz.forEach(function(xdist,j){
       lng = leftPt[0] + (xdist*180/Math.PI);
       gridPt = {loc:[parseFloat(lng),parseFloat(lat)]};
       sites.forEach(function(site,k){
          dist = calcDistance(lng,site.loc.coordinates[0],lat,site.loc.coordinates[1]) * 6378.1; //6,378.1 is km in radius of earth
          Dist2 = Math.pow(dist,2);
          angle = Math.atan2(site.loc.coordinates[0]-lng,site.loc.coordinates[1]-lat) / radConvert;
          gridPt[site.AQSID] = {angle:angle,distance:dist,Dist2:Dist2};
        });
        GridPoints.insert(gridPt);
     })
  });
  console.log('makeBaseGrid ended',Date.now()-begintime)//196000 for 30000 pts
  GridPoints._ensureIndex({ loc: '2dsphere' });
  //console.log('makeindex',Date.now()-begintime);
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

var makeGridatTime = function(bbox,beginepoch,endepoch){
  //might be shorter to walk sites with readings - start with adding values using AirDayWarn?
  //then aggregate, like below
  //for each gridpt - numerator = pollutVal/dist + pollutVal2/dist //or dist*dist, for smoothing
  //denominator = 1/dist + 1/dist2 etc. //or dist*dist
  //radial gaussian ??
  //pull values from 6 before beginepoch
  //value = 6*v6+5*v5etc.  /6!  //what are we doing with wind angle??

var monitors = Monitors.find(
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
  monitors.forEach(function(mon){
  GridPoints.aggregate([ //do I need a square bracket??
   {
     $geoNear: {
        near: { type: "Point", coordinates: mon.loc },
        distanceField: "dist.calculated",
        maxDistance: 30,
        //query: { type: "public" },
        includeLocs: "dist.location",
        num: 5,
        spherical: true
     }
   }
],
  Meteor.bindEnvironment(
      function (err, result) {
          _.each(result, function (e) {
            //should be able to go through each pollutant and set out a numerator and denom
            //not sure I'm thinking about this right; could be a better way to project, etc.
            logger.info(result)
          }),
          function(err){
            console.log('error in aggregation at Monitors: ',err)
          }
        }
      )
);
});//end of monitors.forEach
}; //end of makeGridatTime
Meteor.startup(function(){
  console.log(GridPoints.find().count())
  if (GridPoints.find().count() == 0){
    makeBaseGrid([[-94.5,29.0],[-96,29.0],[-96,31],[-94.5,31.0],[-94.5,29.0]]);
    //GridPoints.createIndex( { loc : "2dsphere" } ); //do in callback? not working in any case
  }
  //

});

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
    // newInterpolation: function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
    //     logger.info('Helper called interpolate2grid for pollutant at center with distance: ', pollutant, ' start: ', startEpoch, ' end: ', endEpoch, center, include_distance);
    //     interpolate2grid(center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch);
    // }
});

//could have the livewatcher from livefeed call this one, too
