//required packages
// var csvmodule = Meteor.npmRequire('csv');
// var fs = Meteor.npmRequire('fs');
//get sites in region; filter by if they have the pollutant of interest
//divide bbox (leftbottom[long/lat]/righttop[long/lat]) by gridstep;
//for each gridpt, calculate distance to each station and rank - (should it have cutoff?)


//create wind system for that grid (could use different pipeline for more wind stations, later)
//   gets avg of speed and angle of wind for that time, not using tail, etc. - incorporated in gas step
//calculate pollutant/gas value using inverse square weighting, and weight for wind

//http://www.environmentaljournal.org/1-3/ujert-1-3-10.pdf --inverse distance weighting better than ordinary kriging
//http://capita.wustl.edu/capita/capitareports/mappingairquality/mappingaqi.pdf -- for clustering of dense urban sites in bigger steps
//http://www.irceline.be/~celinair/rio/rio_corine.pdf using landcover with a kriging system
//https://www3.epa.gov/airtrends/specialstudies/dsisurfaces.pdf --2004, mostly kriging, no idw
//http://sites.gsu.edu/jdiem/files/2014/07/EP2002-2fmwe5w.pdf -- argues for linear regression from known sources, and not interpolation


//vgl: https://github.com/DataAnalyticsinStudentHands/OldOzoneMap/tree/master/Data%20Interpolation/Java_src
var interpolate2grid = function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
//https://docs.mongodb.org/manual/reference/operator/aggregation/geoNear/ - for distance; it has to be first in pipeline and has a distancefield on output
    //gather all sites within include_distance, should I still group by 5min epoch
    var interp_pipeline = [
        {
            $match: {
                $and: [{
                    epoch: {
                        $gt: parseInt(startEpoch, 10),
                        $lt: parseInt(endEpoch, 10)
                    }
                }, {
				  site: {
				     $geoWithin: {
				        $box: [
				          [ leftbottom ],  //longitude first
				          [ righttop ] //<upper right coordinates>
				        ]
				     }
				  }
				},{
				  pollutant: pollutant
				}
			]
            }
        }
	];

    LiveData.aggregate(interp_pipeline,
        Meteor.bindEnvironment(
            function (err, result) {
                _.each(result, function (e) {
                    var subObj = {};
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
    new5minAggreg: function (center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch) {
        logger.info('Helper called interpolate2grid for pollutant at center with distance: ', pollutant, ' start: ', startEpoch, ' end: ', endEpoch, center, include_distance);
        interpolate2grid(center, include_distance, gridstep, pollutant, taillength, startEpoch, endEpoch);
    }
});

//could have the livewatcher from livefeed call this one, too