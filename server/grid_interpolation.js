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
var makeBaseGrid = function (bbox, gridstep){
  let sites = Sites.find(
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
  let topPt = _.min(bbox, function(pt){return pt[0]});  //mongo likes long/lat
  let leftPt = _.min(bbox, function(pt){return pt[1]});
  let bottomPt = _.max(bbox, function(pt){return pt[0]});
  let rightPt = _.max(bbox, function(pt){return pt[1]});
  //later: check on whether gridstep is valid; if more than one topPt, go left, else start at it?
  //for now, assume it's a square.
  let gridPoints = [];
  let horiz = _.range(leftPt,rightPt,gridstep);
  let vertical = _.range(topPt,bottomPt,gridstep);
  _.each(horiz, function({
    _.each(vertical, function({
      gridPt = {loc:{coordinates:[vertical,horiz]}};
        _.each(sites, function ({
          gridPt[siteId] = {angle:{calculate angle},distance:{calculate distance}}
        }));
      gridPoints.push(gridPt); //or put it in a collection??
    }))
  }));
};

//using haversine
var calcDistance = function(lng1,lng2,lat1,lat2){
  let radConvert = Math.PI/180;
  let radLat = (lat1-lat2) * radConvert;
  let radLng = (lng1-lng2) * radConvert;
  var a =
    Math.sin(radLat/2) * Math.sin(radLat/2) +
    Math.cos(lat1*radConvert) * Math.cos(lat2*radConvert) *
    Math.sin(radLng/2) * Math.sin(radLng/2)
    ;
  let dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return dist;
}


//vgl: https://github.com/DataAnalyticsinStudentHands/OldOzoneMap/tree/master/Data%20Interpolation/Java_src
var interpolate2grid = function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
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


Meteor.methods({
    newInterpolation: function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
        logger.info('Helper called interpolate2grid for pollutant at center with distance: ', pollutant, ' start: ', startEpoch, ' end: ', endEpoch, center, include_distance);
        interpolate2grid(center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch);
    }
});

//could have the livewatcher from livefeed call this one, too
