////////////////////////////////////////////////////////////////////
//
// Constants
var NODE_GAP = 10;
var SPRING_CONSTANT = 1;
var REPULSION_CONSTANT = 0.01;
var MAX_REPULSION = 50;
var STEP_SIZE = 0.1;
var SETTLED_THRESHOLD = 15;
var FRAMERATE = 30;

// (globals)
var timer;

////////////////////////////////////////////////////////////////////
//
// Node config, creation

var lb, ab, mo, nm, fj, eg, jh, ei, ai, wa, xi, b3, pb, ko, di, bc, cd, nb, hq, ty, ss, ce, rc, jp, no, io, un;

function resetNodes() {
    lb = {name:"lb"};
    ab = {name:"ab"};
    mo = {name:"mo"};
    nm = {name:"nm"};
    fj = {name:"fj"};
    eg = {name:"eg"};
    jh = {name:"jh"};
    ei = {name:"ei"};
    ai = {name:"ai"};
    wa = {name:"wa"};
    xi = {name:"xi"};
    b3 = {name:"b3"};
    pb = {name:"pb"};
    ko = {name:"ko"};
    di = {name:"di"};
    bc = {name:"bc"};
    cd = {name:"cd"};
    nb = {name:"nb"};
    hq = {name:"hq"};
    ty = {name:"ty"};
    ss = {name:"ss"};
    ce = {name:"ce"};
    rc = {name:"rc"};
    jp = {name:"jp"};
    no = {name:"no"};
    io = {name:"io"};
    un = {name:"un"};

    lb.refs = [ab, xi, di];
    ab.refs = [lb, mo];
    mo.refs = [eg, nm];
    nm.refs = [fj];
    fj.refs = [ei, wa];
    eg.refs = [mo, xi, jh];
    jh.refs = [b3, ei];
    ei.refs = [fj, pb];
    ai.refs = [nb, b3, xi];
    wa.refs = [fj, b3, ko];
    xi.refs = [lb, eg, ai];
    b3.refs = [ai, jh, ei, wa];
    pb.refs = [ei, ko, hq, cd];
    ko.refs = [hq];
    di.refs = [ty, bc];
    bc.refs = [nb, cd, b3];
    cd.refs = [jp, pb];
    nb.refs = [ai, bc, no];
    hq.refs = [ko, pb, jp];
    ty.refs = [di, no];
    ss.refs = [xi, ce];
    ce.refs = [ss, rc, io];
    rc.refs = [cd, ce];
    jp.refs = [cd, hq, un];
    no.refs = [ty, ce, nb];
    io.refs = [ce, un];
    un.refs = [io, jp];  
}

function validateNodes(nodeArray) {
    // Interate through node array.
    // If one node references another, make sure the reverse reference exists.

    nodeArray.forEach(function (node) {
        node.refs.forEach(function (referencedNode) {
            if (referencedNode.refs.indexOf(node) == -1) {
                referencedNode.refs.push(node);
            }
        });
    });
}

function shuffle(array) {
    for (var i = 0; i < array.length; i++) {
        var r1 = Math.round(Math.random() * (array.length - 1));
        var r2 = Math.round(Math.random() * (array.length - 1));
        var tmp = array[r2];
        array[r2] = array[r1];
        array[r1] = tmp;
    }
}





////////////////////////////////////////////////////////////////////
//
// Drawing.



function genNodeLinks(nodes) {
    var nodeLinks = [];
    nodes.forEach(function (node, index) {
        node.refs.forEach(function (nodeRef) {
            var refIndex = nodes.indexOf(nodeRef);
            if (refIndex < index && refIndex >= 0) {
                nodeLinks.push([node, nodeRef]);
            }
        });
    });
    return nodeLinks;
}

var canvas = {};
canvas.getCanvas = function (name) {
    this.c = document.getElementById(name);
    this.width = this.c.width;
    this.height = this.c.height;
    this.context = this.c.getContext("2d");
    this.context.font = "14px Arial";
}
canvas.drawLine = function (x1, y1, x2, y2) {
    this.context.moveTo(x1 + this.xOffset, this.height - (y1 + this.yOffset));
    this.context.lineTo(x2 + this.xOffset, this.height - (y2 + this.yOffset));
    this.context.stroke();
};
canvas.drawCircle = function(x, y, radius) {
    this.context.beginPath();
    this.context.arc(x + this.xOffset, this.height - (y + this.yOffset),radius,0,2*Math.PI);
    this.context.stroke();
    this.context.fill();
}
canvas.drawText = function (x, y, text) {
    this.context.fillText(text, x + this.xOffset, this.height - (y + this.yOffset));
};
canvas.clear = function () {
    this.context.clearRect(0, 0, canvas.width, canvas.height);
}
canvas.getCanvas("myCanvas");

function drawMap(nodes, nodeLinks) {

    canvas.clear();

    // Get the highest and lowest X and Y values.
    var minX = 0;
    var maxX = 0;
    var minY = 0;
    var maxY = 0;
    nodes.forEach(function (node) {
        if (node.x < minX) {
            minX = node.x;
        }
        if (node.x > maxX) {
            maxX = node.x;
        }
        if (node.y < minY) {
            minY = node.y;
        }
        if (node.y > maxY) {
            maxY = node.y;
        }
    });
    var mapCenterY = (maxY - minY)/2 + minY;
    var mapCenterX = (maxX - minX)/2 + minX;

    canvas.xOffset = canvas.width/2 - mapCenterX;
    canvas.yOffset = canvas.height/2 - mapCenterY;

    // Draw links
    nodeLinks.forEach(function (nodes) {
        canvas.drawLine(nodes[0].x, nodes[0].y, nodes[1].x, nodes[1].y);
    });

    // Draw labels
    nodes.forEach(function (node) {
        canvas.drawCircle(node.x, node.y, 3);
        canvas.drawText(node.x + 6, node.y + 6, node.name);
    });
}





////////////////////////////////////////////////////////////////////
//
// Physics engine.

function genMap(nodes) {
    var anchorNode;

    // Approach:
    // Iterate through the nodes calculating the net force acting on each node until total force
    // is less than the settled threshold.
    //
    // Keep in mind that the distance is calculated separately then moved in another round.

    // Setup the nodes and the force.
    var angleDelta = 2*Math.PI / nodes.length;
    var angle = 0;
    nodes.forEach(function (node, nodeNum) {
        if (nodeNum == 0) {
            anchorNode = node;
        }

        // Begin by setting a reasonable starting position. This also makes the process order dependant.
        node.x = NODE_GAP * Math.cos(angle);
        node.y = NODE_GAP * Math.sin(angle);
        node.forceX = 0;
        node.forceY = 0;

        angle += angleDelta;
    });

    timer = setInterval(function(){
        step(nodes, anchorNode);
    }, 1000 / FRAMERATE);
}

function step(nodes, anchorNode) {
    // Calculate the force acting on the node.

    nodes.forEach(function (node) {

        // Springs:
        node.refs.forEach(function (nodeRef) {
            // Get force (difference between actual distance and current distance).

            // Somehow need to account for distance.
            var dist = Math.pow(Math.pow(nodeRef.x - node.x, 2) + Math.pow(nodeRef.y - node.y, 2), 0.5);
            var force = NODE_GAP - dist;
            var forceX = (node.x - nodeRef.x) / dist * force;
            var forceY = (node.y - nodeRef.y) / dist * force;

            if (node == anchorNode) {
                nodeRef.forceX += forceX * -1;
                nodeRef.forceY += forceY * -1;
            } else if (nodeRef == anchorNode) {
                node.forceX += forceX;
                node.forceY += forceY;
            } else {
                node.forceX += forceX * 0.5;
                node.forceY += forceY * 0.5;
                nodeRef.forceX += forceX * -0.5;
                nodeRef.forceY += forceY * -0.5;
            }
        });

        // General repellant: cause every node to move away from every other node.
        var currentNode = node;
        nodes.forEach(function (nodeToRepel) {
            if (nodeToRepel != currentNode) {

                // Somehow need to account for distance.
                var dist = Math.pow(Math.pow(nodeToRepel.x - node.x, 2) + Math.pow(nodeToRepel.y - node.y, 2), 0.5);
                var force = MAX_REPULSION * Math.exp(dist * REPULSION_CONSTANT * -1);
                var forceX = (node.x - nodeToRepel.x) / dist * force;
                var forceY = (node.y - nodeToRepel.y) / dist * force;

                if (node == anchorNode) {
                    nodeToRepel.forceX += forceX * -1;
                    nodeToRepel.forceY += forceY * -1;
                } else if (nodeToRepel == anchorNode) {
                    node.forceX += forceX;
                    node.forceY += forceY;
                } else {
                    node.forceX += forceX * 0.5;
                    node.forceY += forceY * 0.5;
                    nodeToRepel.forceX += forceX * -0.5;
                    nodeToRepel.forceY += forceY * -0.5;
                }
            }
        });
    });

    // Reset the total force (to be recalculated while shifting nodes)
    var totalForce = 0;

    // Move each node.
    nodes.forEach(function (node) {

        // Move the node.
        node.x += SPRING_CONSTANT * node.forceX * STEP_SIZE;
        node.y += SPRING_CONSTANT * node.forceY * STEP_SIZE;

        // Add up the total force for the while loop.
        totalForce += Math.abs(node.forceX);
        totalForce += Math.abs(node.forceY);

        // Reset forces.
        node.forceX = 0;
        node.forceY = 0;
    });

    // Draw the map so we know what's happening.
    nodeLinks = genNodeLinks(nodes);
    drawMap(nodes, nodeLinks);

    if (totalForce < SETTLED_THRESHOLD) {
        clearInterval(timer);
    }
}



////////////////////////////////////////////////////////////////////
//
// Where the magic happens, baby.

resetNodes();
var nodes = [lb, ab, mo, nm, fj, eg, jh, ei, ai, wa, xi, b3, pb, ko, di, bc, cd, nb, hq, ty, ss, ce, rc, jp, no, io, un];

function resetGraph() {
    clearInterval(timer);
    resetNodes();
    validateNodes(nodes);
    genMap(nodes);
}

function shuffleNodes() {
    shuffle(nodes);
    resetGraph();
}

