// Logic Gate Simulator
// Copyright (c) 2016 Ministry of Education, Singapore. All rights reserved.

/* global $:false, interact:false */

const Consts = {
  GRID: 20,
  HEIGHT: 20,
  NODE: 3,
  PALETTE: 4,
};

let Simulation  = {

  // List of all nodes in the simulation.
  nodes: [],

  // List of all links in the simulation.
  links: [],

  // Adds a node of the given type and returns its id.
  addNode(numInPorts, numOutPorts, logic) {
    let nodeId = this.nodes.length;
    let inPorts = [];
    let outPorts = [];
    for (let i = 0; i < numInPorts; i++) {
      inPorts[i] = { nodeId: nodeId, portId: i, inPort: true, linkId: null }
    }
    for (let i = 0; i < numOutPorts; i++) {
      outPorts[i] = { nodeId: nodeId, portId: i, inPort: false, linkId: null }
    }
    this.nodes[nodeId] = {
      nodeId: nodeId,
      state: null,
      inPorts: inPorts,
      outPorts: outPorts,
      logic: logic
    };
    return nodeId;
  },

  getNode(nodeId) {
    return this.nodes[nodeId];
  },

  // Removes a node.
  removeNode(nodeId) {
    let node = this.nodes[nodeId];
    for (let inPort of node.inPorts) {
      if (inPort.linkId !== null) {
        this.removeLink(inPort.linkId);
      }
    }
    for (let outPort of node.outPorts) {
      if (outPort.linkId !== null) {
        this.removeLink(outPort.linkId);
      }
    }
    delete this.nodes[nodeId];
  },

  // Returns whether two ports are allowed to link.
  canLink(outNodeId, outPortId, inNodeId, inPortId) {
    let queue = [];
    // let visited = [];

    // Populate seed nodes.
    for (let port of this.nodes[inNodeId].outPorts) {
      if (port.linkId === null) {
        continue;
      }
      let link = this.links[port.linkId];
      queue.push(link.inPortId);
    }

    // TODO
    return true;
  },

  // Adds a link between two ports.
  addLink(outNodeId, outPortId, inNodeId, inPortId) {
    let linkId = this.links.length;
    this.links[linkId] = {
      linkId: linkId,
      state: null,
      outNodeId: outNodeId,
      outPortId: outPortId,
      inNodeId: inNodeId,
      inPortId: inPortId,
    }

    let outPort = this.nodes[outNodeId].outPorts[outPortId];
    if (outPort.linkId !== null) {
      this.removeLink(outPort.linkId);
    }
    outPort.linkId = linkId;

    let inPort = this.nodes[inNodeId].inPorts[inPortId];
    if (inPort.linkId !== null) {
      this.removeLink(inPort.linkId);
    }
    inPort.linkId = linkId;

    return linkId;
  },

  getLink(linkId) {
    return this.links[linkId];
  },

  removeLink(linkId) {
    let link = this.links[linkId];
    this.nodes[link.outNodeId].outPorts[link.outPortId].linkId = null;
    this.nodes[link.inNodeId].inPorts[link.inPortId].linkId = null;
    delete this.links[linkId];
  },

  getNodeState(nodeId) {
    return this.nodes[nodeId].state;
  },

  getLinkState(linkId) {
    return this.links[linkId].state;
  },

  update() {
    let queue = [];
    let visited = [];

    // Reset all states.
    for (let node of this.nodes) {
      node.state = null;
    }
    for (let link of this.links) {
      link.state = null;
    }

    // Populate seed nodes.
    for (let node of this.nodes) {
      if (node.inPorts.length === 0) {
        queue.push(node.nodeId);
      }
    }

    // Process until queue is empty.
    while (queue.length > 0) {
      let node = this.nodes[queue.pop()];
      let inputs = [];

      // Collate inputs.
      for (let port of node.inPorts) {
        inputs.push(this.links[port.linkId].state);
      }

      // Update state.
      node.state = node.logic(inputs);

      // Propagate outputs and push completed nodes to queue.
      for (let port of node.outPorts) {
        if (port.linkId === null) {
          continue;
        }
        let link = this.links[port.linkId];
        link.state = node.state;

        let candidate = this.nodes[link.inNodeId];
        let completed = true;
        for (let candidatePort of candidate.inPorts) {
          if (candidatePort.linkId === null) {
            completed = false;
            break;
          }
          let candidateLink = this.links[candidatePort.linkId];
          if (candidateLink.state === null) {
            completed = false;
            break;
          }
        }
        if (completed && visited.indexOf(candidate.nodeId) === -1) {
          queue.push(candidate.nodeId);
        }
      }

      visited.push(node.nodeId);
    }
  }

};

// const main = function() {
//   let id = Simulation.addNode(0, 1, () => true);
//   let id2 = Simulation.addNode(1, 1, () => true);
//   let id3 = Simulation.addNode(1, 0, () => true);
//   Simulation.addLink(id, 0, id2, 0);
//   Simulation.addLink(id2, 0, id3, 0);
//   Simulation.update();
//   Simulation.removeNode(id);
// }

const board = $('#board');
const grid = $('#grid');
const nodes = $('#nodes');
let map = [[]];

// // Print map to console for debugging purposes.
// const printMap = function() {
//   const strings = new Array(Consts.HEIGHT);
//   for (let i = 0; i < strings.length; i++) {
//     strings[i] = '';
//   }
//   for (let column of map) {
//     for (let i = 0; i < strings.length; i++) {
//       strings[i] += column[i] ? "*" : ".";
//     }
//   }
//   console.log(strings.join('\n'));
// }

// Convert coordinates from page-space (pixels) to grid-space (squares).
const toGrid = function(coords) {
  const offset = grid.offset();
  return {
    x: Math.round((coords.x - offset.left) / Consts.GRID),
    y: Math.round((coords.y - offset.top) / Consts.GRID),
  };
}

// Convert coordinates from grid-space (squares) to page-space (pixels).
const toPage = function(coords) {
  const offset = grid.offset();
  return {
    x: offset.left + coords.x * Consts.GRID,
    y: offset.top + coords.y * Consts.GRID,
  };
}

const isFreeSpace = function({x, y}) {
  if (x < 1 || y < 1) return false;
  if (x > map.length - Consts.NODE - 1) return false;
  if (y > Consts.HEIGHT - Consts.NODE - 1) return false;
  for (let i = -1; i < Consts.NODE + 1; i++) {
    for (let j = -1; j < Consts.NODE + 1; j++) {
      if (map[x + i][y + j]) {
        return false;
      }
    }
  }
  return true;
}

const findFreeSpace = function({x, y}) {
  // TODO: optimise if this becomes too slow
  const maxDimension = Math.max(map.length, Consts.HEIGHT);
  if (isFreeSpace({x, y})) return {x, y};
  for (let d = 1; d < maxDimension; d++) {
    if (isFreeSpace({x: x - d, y: y})) return {x: x - d, y: y};
    if (isFreeSpace({x: x + d, y: y})) return {x: x + d, y: y};
    if (isFreeSpace({x: x, y: y - d})) return {x: x, y: y - d};
    if (isFreeSpace({x: x, y: y + d})) return {x: x, y: y + d};
    for (let dd = 1; dd <= d - 1; dd++) {
      if (isFreeSpace({x: x - dd, y: y - d})) return {x: x - dd, y: y - d};
      if (isFreeSpace({x: x - dd, y: y + d})) return {x: x - dd, y: y + d};
      if (isFreeSpace({x: x + dd, y: y - d})) return {x: x + dd, y: y - d};
      if (isFreeSpace({x: x + dd, y: y + d})) return {x: x + dd, y: y + d};
      if (isFreeSpace({x: x - d, y: y - dd})) return {x: x - d, y: y - dd};
      if (isFreeSpace({x: x + d, y: y - dd})) return {x: x + d, y: y - dd};
      if (isFreeSpace({x: x - d, y: y + dd})) return {x: x - d, y: y + dd};
      if (isFreeSpace({x: x + d, y: y + dd})) return {x: x + d, y: y + dd};
    }
    if (isFreeSpace({x: x - d, y: y - d})) return {x: x - d, y: y - d};
    if (isFreeSpace({x: x - d, y: y + d})) return {x: x - d, y: y + d};
    if (isFreeSpace({x: x + d, y: y - d})) return {x: x + d, y: y - d};
    if (isFreeSpace({x: x + d, y: y + d})) return {x: x + d, y: y + d};
  }
  // TODO: Handle exception more elegantly!
  alert('Can\'t find free space!');
  return null;
}

const resizeHandler = function() {
  const oldGridWidth = map.length;
  const newGridWidth = Math.floor(grid.parent().width() / Consts.GRID);
  if (newGridWidth !== oldGridWidth) {
    // Resize internal map.
    let oldMap = map;
    map = new Array(newGridWidth);
    for (let i = 0; i < newGridWidth; i++) {
      map[i] = new Array(Consts.HEIGHT);
      for (let j = 0; j < Consts.HEIGHT; j++) {
        map[i][j] = false;
      }
    }

    // Initialise new map.
    for (let node of $('#nodes').children()) {
      const n = $(node);
      let nodeInfo = n.data('nodeInfo');
      let freeSpace = findFreeSpace({ x: nodeInfo.gridX, y: nodeInfo.gridY });
      // TODO: handle no free space
      nodeInfo.gridX = freeSpace.x;
      nodeInfo.gridY = freeSpace.y;
      n.data('nodeInfo', nodeInfo);
      const offset = toPage(freeSpace);
      n.offset({ left: offset.x, top: offset.y });
      for (let i = 0; i < Consts.NODE; i++) {
        for (let j = 0; j < Consts.NODE; j++) {
          map[freeSpace.x + i][freeSpace.y + j] = true;
        }
      }
    }

    // Resize visible grid UI.
    const newWidth = newGridWidth * Consts.GRID + 1;
    grid.width(newWidth);
    $('.link').width(newWidth);
  }
}

const initPalette = function(id, defs) {
  const table = $(id);
  const template = $('#node-template').children().first();
  let row = null;
  for (let i = 0; i < defs.length; i++) {
    if (i % Consts.PALETTE === 0) {
      if (row !== null) {
        row.appendTo(table);
      }
      row = $(document.createElement('tr'));
    }
    let data = $(document.createElement('td'));
    let node = template.clone();
    // TODO: add functionality to node palette item
    node.appendTo(data);
    data.appendTo(row);
  }
  if (row !== null) {
    for (let i = 0; i < Consts.PALETTE - row.children().length; i++) {
      $(document.createElement('td')).appendTo(row);
    }
    row.appendTo(table);
  }
}

$(document).ready(function() {
  // Dynamically resize grid.
  const square = $('#square');
  grid.height(Consts.GRID * Consts.HEIGHT + 1);
  square.attr('width', Consts.GRID);
  square.attr('height', Consts.GRID);
  square.children().attr('d', `M ${Consts.GRID} 0 L 0 0 0 ${Consts.GRID}`);
  resizeHandler();

  // TODO: Set up inputs palette.


  // TODO: Set up logic gates palette.
  initPalette('#gates-palette', [
    1,
    2,
    3
  ]);

  // TODO: Set up outputs palette.

});

$(window).resize(resizeHandler);

interact('.node-grabber')
  // .origin('#board')
  .draggable({

    // restrict: {
    //   restriction: grid,
    //   endOnly: true,
    //   elementRect: { left: 0, right: 1, top: 0, bottom: 1 }
    // },

    manualStart: true,

    snap: {
      targets: [
        function(x, y) {
          let newCoords = toPage(toGrid({
            x: x - Consts.NODE / 2 * Consts.GRID,
            y: y - Consts.NODE / 2 * Consts.GRID
          }));
          newCoords.x += Consts.NODE / 2 * Consts.GRID;
          newCoords.y += Consts.NODE / 2 * Consts.GRID;
          return newCoords;
        }
      ],
    },

    onmove(event) {
      const target = $(event.target).parent();
      target.offset({
        left: event.pageX - Consts.NODE / 2 * Consts.GRID,
        top: event.pageY - Consts.NODE / 2 * Consts.GRID
      });
    },

    onstart(event) {
      const target = $(event.target).parent();
      let nodeInfo = target.data('nodeInfo');
      if (typeof nodeInfo !== 'undefined') {
        for (let i = 0; i < Consts.NODE; i++) {
          for (let j = 0; j < Consts.NODE; j++) {
            map[nodeInfo.gridX + i][nodeInfo.gridY + j] = false;
          }
        }
      }
    },

    onend(event) {
      const target = $(event.target).parent();
      let {x: gridX, y: gridY} = toGrid({
        x: event.pageX - Consts.NODE / 2 * Consts.GRID,
        y: event.pageY - Consts.NODE / 2 * Consts.GRID
      });

      // TODO: Detect if node should be deleted.


      // Otherwise find nearest free space for node.
      // If no free space can be found, delete the node.
      let freeSpace = findFreeSpace({ x: gridX, y: gridY });
      // TODO: handle no free space
      gridX = freeSpace.x;
      gridY = freeSpace.y;

      // Move node to nearest free space.
      const coords = toPage(freeSpace);
      target.offset({ left: coords.x, top: coords.y });

      // Update nodeInfo, or create nodeInfo if new node was created.
      let nodeInfo = target.data('nodeInfo');
      if (typeof nodeInfo === 'undefined') {
        nodeInfo = {};
        // TODO: create node in simulation and nodeId
      }
      nodeInfo.gridX = gridX;
      nodeInfo.gridY = gridY;
      target.data('nodeInfo', nodeInfo);

      // Update map.
      for (let i = 0; i < Consts.NODE; i++) {
        for (let j = 0; j < Consts.NODE; j++) {
          map[gridX + i][gridY + j] = true;
        }
      }
    }

  })

  .on('move', function(event) {
    const interaction = event.interaction;
    if (interaction.pointerIsDown && !interaction.interacting()) {
      let target = $(event.currentTarget).parent();
      if (target.hasClass('node-palette')) {
        const clone = target.clone();
        clone.removeClass('node-palette');
        // TODO: customise clone further
        clone.appendTo('#nodes');
        clone.offset($(event.currentTarget).parent().offset());
        target = clone;
      }
      // Note: interaction.start() does NOT work with a jQuery-wrapped element,
      // so it is unwrapped in the call below.
      interaction.start({ name: 'drag' }, event.interactable, target.children('.node-grabber')[0]);
    }
  });

interact('.node-port-in')
  .draggable({
    onstart(event) {
      $(event.target).addClass('node-dragging');
    },
    onend(event) {
      $(event.target).removeClass('node-dragging');
    }
  })
  .dropzone({
    accept: '.node-port-out',
    ondropactivate(event) {
      const target = $(event.target);
      if (!target.parent().hasClass('node-palette')) {
        target.addClass('node-dropzone');
      }
    },
    ondropdeactivate(event) {
      const target = $(event.target);
      if (!target.parent().hasClass('node-palette')) {
        target.removeClass('node-dropzone');
      }
    },
  });

interact('.node-port-out')
  .draggable({
    onstart(event) {
      $(event.target).addClass('node-dragging');
    },
    onend(event) {
      $(event.target).removeClass('node-dragging');
    }
  })
  .dropzone({
    accept: '.node-port-in',
    ondropactivate(event) {
      const target = $(event.target);
      if (!target.parent().hasClass('node-palette')) {
        target.addClass('node-dropzone');
      }
    },
    ondropdeactivate(event) {
      const target = $(event.target);
      if (!target.parent().hasClass('node-palette')) {
        target.removeClass('node-dropzone');
      }
    },
  });
