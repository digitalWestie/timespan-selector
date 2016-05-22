angular.module("ui.timespan-selector", ["angularMoment"])
    .directive("uiTimespans", ["moment", function (moment) {
        return {
            restrict: "EA",
            require: 'ngModel',
            template: '<div></div>',
            scope: { selections: '=ngModel', maxSelections: '=' },
            replace: true,
            link: function (scope, element, attrs) {
                
                //0 - 6.283185307179586 represent 0 to 360 degrees

                var div = angular.element(element[0]).append('<button class="addSelection">Add selection</button>');
                angular.element(div.children()[0]).on("click", function(){
                    addSelection();
                });
                
                var _arc = d3.svg.arc().startAngle(0 * (Math.PI / 180)).endAngle(360 * (Math.PI / 180));
                var _selectedArcs = [];
                
                var intervalPeriod = 5; //minutes
                var _intervalAngles = 360 / ((24*60) / intervalPeriod);

                var _w = 200;
                var _h = _w;
                var _diameter = _w;
                var _margin = { top:0, right:0, bottom:0, left:0 }; //changing marging may upset angle calc
                var _fontSize = 10;

                var _width;
                var _height;
                var _x0;
                var _y0;

                measure();

                var svg = d3.select(element[0]).selectAll("svg").data([undefined]);

                var enter = svg.enter().append("svg")
                    .attr("class", "x1-timepicker-svg").append("g")
                    .attr("transform", "translate(" + _margin.left + "," + _margin.top + ")");

                svg.attr("width", _w).attr("height", _h);

                var background = enter.append("g")
                    .attr("class", "x1-timepicker-component");

                var body = background.append("circle")
                    .attr("class", "x1-timepicker-inner")
                    .attr("transform", "translate(" + _x0 + "," + _y0 + ")")
                    .attr("cx", 0)
                    .attr("cy", 0)
                    .attr("r", _width / 2);

                function anglesFromTimes(startTime, endTime){
                    var sa = getTimeAngle(startTime);
                    var ea = getTimeAngle(endTime);
                    if (sa > ea) { ea += 360; }
                    return [sa,ea];
                }
                
                var slider = background.append("path").attr("class", "hoop")
                    .attr("transform", "translate(" + _x0 + "," + _y0 + ")")
                    .attr("d", _arc)
                    .on("click", function(){
                        var ev = d3.mouse(d3.select('svg').node());
                        var targetAngle = getTargetAngle(ev[0], ev[1]);
                        targetAngle = roundToInterval(targetAngle);
                        var startTime = getAngleTime(targetAngle);
                        addSelection(startTime);
                    });

                var arcContainer = enter.append("g")
                    .attr("class", "x1-timepicker-arcs");

                // ---------- labels for the picker ------------------------------------------
                var labels = enter.append("g")
                    .attr("class", "x1-timepicker-labels");

                var labelSendAt = labels.append("text")
                    .attr("class", "title")
                    .attr("x", _x0)
                    .attr("y", _width / 4.2 + _fontSize / 3)
                    .attr("width", _width)
                    .text("Time")
                    .style("font-size", (_fontSize * 0.4) + "px");

                var labelTime = labels.append("text")
                    .attr("class", "time")
                    .attr("x", _x0)
                    .attr("y", _y0 + _fontSize / 3)
                    .attr("width", _width)
                    .style("font-size", (_fontSize * 1.4) + "px");
    
                function boundaryChecks(newAngles, oldAngles){
                    if ((newAngles[0] >= oldAngles[0]-_intervalAngles) && (newAngles[0] <= oldAngles[1]+_intervalAngles)){ return true; }
                    if ((newAngles[1] >= oldAngles[0]-_intervalAngles) && (newAngles[1] <= oldAngles[1]+_intervalAngles)){ return true; }
                    if ((oldAngles[0] >= newAngles[0]-_intervalAngles) && (oldAngles[0] <= newAngles[1]+_intervalAngles)){ return true; }
                    if ((oldAngles[1] >= newAngles[1]-_intervalAngles) && (oldAngles[1] <= newAngles[0]+_intervalAngles)){ return true; }
                    return false;
                }

                function inBoundary(selections, currentAngles, newAngles){
                    var inBounds = false;
                    selections.forEach(function(s,i){
                        if (inBounds){ return; }
                        if ((s.angles[0] == currentAngles[0]) && (s.angles[1] == currentAngles[1])){ return; } // dont compare with itself
                        inBounds = boundaryChecks(newAngles, s.angles);

                        //check same but for periods bridging 360 mark
                        if (s.angles[1] > 360) {
                            inBounds = boundaryChecks(newAngles, [0.0, s.angles[1]-360]);
                            if (inBounds){ return; }
                            inBounds = boundaryChecks(newAngles, [s.angles[0], 360]);
                            if (inBounds){ return; }
                        }
                        if (newAngles[1] > 360) { 
                            inBounds = boundaryChecks([0.0, newAngles[1]-360], s.angles);
                            if (inBounds){ return; }
                            inBounds = boundaryChecks([newAngles[0], 360], s.angles);
                            if (inBounds){ return; }
                        }
                    });
                    return inBounds;
                };
                
                function getTargetAngle(eventX,eventY){
                    var _C = Math.PI * _width;
                    var ox = 0;
                    var oy = 0;
                    var ax = 0;
                    var ay = _height / 2;
                    var bx = eventX - _width / 2;
                    var by = _height / 2 - eventY;
                    var k = (by - oy)/(bx - ox);
                    var angel = Math.abs(Math.atan(k) / (Math.PI / 180));

                    var targetAngel = 0;
                    if (bx > 0 && by >= 0) {
                        targetAngel = 90 - angel;
                    } else if (bx >= 0 && by < 0) {
                        targetAngel = 90 + angel;
                    } else if (bx < 0 && by <= 0) {
                        targetAngel = 270 - angel;
                    } else if (bx <= 0 && by > 0) {
                        targetAngel = 270 + angel;
                    }
                    return targetAngel;
                }

                function getAngleTime(angle){
                    var ratio = angle/360;
                    var timeIn = ratio*86400000;
                    //make sure to use utc
                    return moment(moment().utc().startOf('day').valueOf() + timeIn).utc();
                }

                function getTimeAngle(time){
                    var t = moment(time).utc()-0;
                    var start = moment(time).utc().startOf('day')-0;
                    var ratio = (t-start) / 86400000;
                    return ratio*360;
                }

                function roundToInterval(angle){
                    _intervalAngles = 1.25;
                    modVal = angle % _intervalAngles;
                    if (modVal >= _intervalAngles/2) {  
                        angle = (angle-modVal)+1.25
                    } else {  
                        angle -= modVal    
                    }
                    return angle;
                }

                function addSelection (startTime) {
                    if (startTime == undefined){
                        startTime = moment().utc().hours(1).minutes(0).seconds(0);
                        var lastIdx = scope.selections.length-1;
                        if (lastIdx!=-1){
                            startTime = scope.selections[lastIdx].end.clone().add(10, 'minutes');
                        }
                    }

                    var endTime = startTime.clone().add(30, 'minutes');
                    var sa = getTimeAngle(startTime);
                    var ea = getTimeAngle(endTime);
                    if (sa > ea){ ea += 360; }
                    var angles = [sa,ea];

                    if (inBoundary(scope.selections, angles, angles)) { return; } // hitting other selections

                    if (scope.selections.length < scope.maxSelections) {
                        var new_arr = scope.selections.concat({ start: startTime, end: endTime, angles: angles });
                        scope.selections = new_arr;
                        scope.$apply();
                    }
                }

                scope.$watch('selections', function (newVal, oldVal) {
                    if ((!newVal || newVal.length===0)) { return; }
                    enter.selectAll('.arc, .handle-container').remove();
                    
                    scope.selections.forEach(function(t,i){
                        _arc.startAngle((t.angles[0] * Math.PI / 180));
                        _arc.endAngle((t.angles[1] * Math.PI / 180));

                        var selArc = arcContainer.append("path")
                            .attr("class", "arc")
                            .attr("transform", "translate(" + _x0 + "," + _y0 + ")")
                            .attr("d", _arc);

                        _selectedArcs.push(selArc);

                        var dragHandleEnd = d3.behavior.drag();
                        dragHandleEnd.on("drag", function () {
                            var eventX = d3.event.x;
                            var eventY = d3.event.y;
                            var targetAngle = getTargetAngle(eventX, eventY);
                            targetAngle = roundToInterval(targetAngle);
                            
                            if (Math.abs(targetAngle - t.angles[0]) <= _intervalAngles){ return; } //selection too short
                            if (targetAngle < t.angles[0]){ targetAngle+=360; }
                            if (inBoundary(scope.selections, t.angles, [t.angles[0], targetAngle] )){ return; } // hitting other selections
                            
                            t.angles[1] = targetAngle;
                            _arc.startAngle((t.angles[0] * Math.PI / 180));
                            _arc.endAngle((t.angles[1] * Math.PI / 180));
                            selArc.attr("d", _arc);

                            //setHandlePosition
                            _arc.startAngle(((t.angles[1]-_intervalAngles) * Math.PI / 180));
                            _arc.endAngle(((t.angles[1]+_intervalAngles) * Math.PI / 180));
                            endHandle.attr("d", _arc);
                        });
                        
                        dragHandleEnd.on("dragend", function(){ 
                            t.end = getAngleTime(t.angles[1]);
                            scope.$apply();
                        });

                        _arc.startAngle(((t.angles[1]-_intervalAngles) * Math.PI / 180));
                        _arc.endAngle(((t.angles[1]+_intervalAngles) * Math.PI / 180));

                        var endHandle = enter.append("g").attr("class", "handle-container")
                            .append("path")
                            .attr("class", "x1-timepicker-handler end-handle")
                            .attr("cursor", "pointer")
                            .attr("fill", "#FFFFFF")
                            .attr("transform", "translate(" + _x0 + "," + _y0 + ")")
                            .attr("d", _arc)
                            .call(dragHandleEnd);

                        var dragHandleStart = d3.behavior.drag();
                        dragHandleStart.on("drag", function() {
                            var eventX = d3.event.x;
                            var eventY = d3.event.y;
                            var targetAngle = getTargetAngle(eventX, eventY);
                            targetAngle = roundToInterval(targetAngle);
                            var endAngle = t.angles[1];
                            
                            if (Math.abs(t.angles[1] - targetAngle) <= _intervalAngles){ return; }
                            if (Math.abs(endAngle-targetAngle) > 360){ endAngle-=360; }
                            if (endAngle < targetAngle){ endAngle+=360; }
                            if (inBoundary(scope.selections, t.angles, [targetAngle, endAngle])){ return; }
                            
                            t.angles[0] = targetAngle;
                            t.angles[1] = endAngle;
                            _arc.startAngle((t.angles[0] * Math.PI / 180));
                            _arc.endAngle((t.angles[1] * Math.PI / 180));
                            selArc.attr("d", _arc);
                            
                            //setHandlePosition
                            _arc.startAngle(((t.angles[0]-_intervalAngles) * Math.PI / 180));
                            _arc.endAngle(((t.angles[0]+_intervalAngles) * Math.PI / 180));
                            startHandle.attr("d", _arc);
                        });

                        dragHandleStart.on("dragend", function(){ 
                            t.start = getAngleTime(t.angles[0]);
                            scope.$apply();
                        });

                        _arc.startAngle(((t.angles[0]-_intervalAngles) * Math.PI / 180));
                        _arc.endAngle(((t.angles[0]+_intervalAngles) * Math.PI / 180));
                        
                        var startHandle = enter.append("g").attr("class", "handle-container")
                            .append("path").attr("class", "x1-timepicker-handler start-handle")
                            .attr("cursor", "pointer")
                            .attr("transform", "translate(" + _x0 + "," + _y0 + ")")
                            .attr("fill", "#FFFFFF")
                            .attr("d", _arc)
                            .call(dragHandleStart);
                        
                    });
                });

                function measure () {
                    _width = _height = _diameter - _margin.right - _margin.left - _margin.top - _margin.bottom;
                    _x0 = _y0 = _width / 2;
                    _fontSize = _width * .2;
                    _arc.outerRadius(_width / 2);
                    _arc.innerRadius(_width / 2 * .85);
                }

                function setHandlePosition(handle, angle){
                    var r = _width / 2 - 5;
                    var x = r * Math.cos((angle - 90) * Math.PI / 180);
                    var y = r * Math.sin((angle - 90) * Math.PI / 180);
                    handle.attr('cx', x).attr('cy', y);
                    handle.attr('x', x).attr('y', y);
                }
            }
        };
    }]);
