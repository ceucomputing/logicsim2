// Logic Gate Simulator
// Copyright (c) 2016 Ministry of Education, Singapore. All rights reserved.

/* global $:false, interact:false */

const Consts = {
  GRID: 20,
  HEIGHT: 29,
  NODE: 3,
  PALETTE: 4,
};

/*
================================================================================
SIMULATION
================================================================================
*/

let Simulation  = {

  // List of all nodes in the simulation.
  nodes: [],

  // List of all links in the simulation.
  links: [],

  // Adds a node of the given type and returns its id.
  addNode(numInPorts, numOutPorts, logic, elem) {
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
      nodeId,
      state: null,
      inPorts,
      outPorts,
      logic,
      elem,
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

    // Remove associated DOM element.
    $(node.elem).remove();
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
  addLink(outNodeId, outPortId, inNodeId, inPortId, elem) {
    let linkId = this.links.length;
    this.links[linkId] = {
      linkId,
      state: null,
      outNodeId,
      outPortId,
      inNodeId,
      inPortId,
      elem,
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

    // Remove associated DOM element and metadata.
    const linkInfo = $(link.elem).data('linkInfo');
    linkInfo.inPortElem.removeData('linkId');
    linkInfo.outPortElem.removeData('linkId');
    $(link.elem).remove();
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


/*
================================================================================
USER INTERFACE
================================================================================
*/

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
const links = $('#links');
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

// Returns whether the given coordinates has space for a node.
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

// Returns the closest set of coordinates with space for a node, or null if none is found.
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
  return null;
}

const resizeHandler = function() {
  const oldGridWidth = map.length;
  const newGridWidth = Math.floor(grid.parent().width() / Consts.GRID);
  if (newGridWidth !== oldGridWidth) {
    // Resize internal map.
    map = new Array(newGridWidth);
    for (let i = 0; i < newGridWidth; i++) {
      map[i] = new Array(Consts.HEIGHT);
      for (let j = 0; j < Consts.HEIGHT; j++) {
        map[i][j] = false;
      }
    }

    // Initialise new map.
    let nodesToDelete = [];
    for (let node of $('#nodes').children()) {
      const n = $(node);
      let nodeInfo = n.data('nodeInfo');
      let freeSpace = findFreeSpace({ x: nodeInfo.gridX, y: nodeInfo.gridY });
      // TODO: handle no free space
      if (freeSpace === null) {
        nodesToDelete.push(node);
        continue;
      }
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
    for (let node of nodesToDelete) {
      removeNodeElem(node);
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
    const def = defs[i];
    let data = $(document.createElement('td'));
    let node = template.clone();

    // Add row break if needed.
    if (i % Consts.PALETTE === 0) {
      if (row !== null) {
        row.appendTo(table);
      }
      row = $(document.createElement('tr'));
    }

    // TODO: add functionality to node palette item
    node.data('def', def);
    switch (def.numInPorts) {
      case 0:
        node.find('.node-port-in-1').hide();
        node.find('.node-port-in-2').hide();
        node.find('.node-port-in-3').hide();
        break;
      case 1:
        node.find('.node-port-in-1').hide();
        node.find('.node-port-in-2').first().data('inPortId', 0);
        node.find('.node-port-in-3').hide();
        break;
      case 2:
        node.find('.node-port-in-1').first().data('inPortId', 0);
        node.find('.node-port-in-2').hide();
        node.find('.node-port-in-3').first().data('inPortId', 1);
        break;
      case 3:
        node.find('.node-port-in-1').first().data('inPortId', 0);
        node.find('.node-port-in-2').first().data('inPortId', 1);
        node.find('.node-port-in-3').first().data('inPortId', 2);
        break;
    }
    switch (def.numOutPorts) {
      case 0:
        node.find('.node-port-out-1').hide();
        node.find('.node-port-out-2').hide();
        node.find('.node-port-out-3').hide();
        break;
      case 1:
        node.find('.node-port-out-1').hide();
        node.find('.node-port-out-2').first().data('outPortId', 0);
        node.find('.node-port-out-3').hide();
        break;
      case 2:
        node.find('.node-port-out-1').first().data('outPortId', 0);
        node.find('.node-port-out-2').hide();
        node.find('.node-port-out-3').first().data('outPortId', 1);
        break;
      case 3:
        node.find('.node-port-out-1').first().data('outPortId', 0);
        node.find('.node-port-out-2').first().data('outPortId', 1);
        node.find('.node-port-out-3').first().data('outPortId', 2);
        break;
    }
    $(def.icon).children().clone().appendTo(node.find('.node-grabber'))

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

const removeNodeElem = function(elem) {
  const nodeInfo = $(elem).data('nodeInfo');
  if (typeof nodeInfo === 'undefined') {
    elem.remove();
  } else {
    Simulation.removeNode(nodeInfo.nodeId);
  }
}

const getPortCoords = function(elem) {
  const node = elem.parent();
  const def = node.data('def');
  const nodeInfo = node.data('nodeInfo');
  let result = {
    x: nodeInfo.gridX,
    y: nodeInfo.gridY,
  }
  if (elem.hasClass('node-port-in')) {
    const inPortId = elem.data('inPortId');
    switch (inPortId) {
      case 0:
        result.y += (def.numInPorts == 1) ? 1 : 0;
        break;
      case 1:
        result.y += (def.numInPorts == 2) ? 2 : 1;
        break;
      case 2:
        result.y += 2;
        break;
    }
  } else {
    const outPortId = elem.data('outPortId');
    result.x += 2;
    switch (outPortId) {
      case 0:
        result.y += (def.numOutPorts == 1) ? 1 : 0;
        break;
      case 1:
        result.y += (def.numOutPorts == 2) ? 2 : 1;
        break;
      case 2:
        result.y += 2;
        break;
    }
  }
  return result;
}

const isOpen = function(coords) {
  if (coords.x < 0 || coords.y < 0) return false;
  if (coords.x > map.length - 1) return false;
  if (coords.y > map[coords.x].length - 1) return false;
  return !map[coords.x][coords.y];
}

const toCoordsString = function(coords) {
  return String(coords.x) + ',' + String(coords.y);
}

const toCoords = function(coordsString) {
  const index = coordsString.indexOf(',');
  return { x: Number(coordsString.slice(0, index)), y: Number(coordsString.slice(index + 1)) };
}

const equalCoords = function(a, b) {
  return a.x === b.x && a.y === b.y;
}

const addToPath = function(coords, dict, heap, path, length, diagonal) {
  if (isOpen(coords)) {
    const coordsString = toCoordsString(coords);
    const newLength = length + (diagonal ? 1.5 : 1);
    let info = dict[coordsString];
    if (typeof info === 'undefined') {
      // This space has not been visited before.
      info = {
        coords,
        path: [coords].concat(path),
        length: newLength,
      };
      dict[coordsString] = info;
      heap.push(info);
    } else {
      // Only overwrite path if new path is shorter.
      if (newLength < info.length) {
        info.path = [coords].concat(path);
        info.length = newLength;
      }
    }
  }
}

const findPath = function(inCoords, outCoords) {
  const compare = (a, b) => a.length - b.length;
  const startCoords = { x: inCoords.x - 1, y: inCoords.y };
  const startCoordsString = toCoordsString(startCoords);
  const endCoords = { x: outCoords.x + 1, y: outCoords.y };
  let dict = {};
  let heap = [];
  let info = {
    coords: startCoords,
    path: [startCoords],
    length: 1,
  };
  dict[startCoordsString] = info;
  heap.push(info);
  while (Object.keys(heap).length > 0) {
    heap.sort(compare);

    // Once a space is shifted from the heap, the path is guaranteed to be shortest.
    const shortest = heap.shift();
    if (equalCoords(shortest.coords, endCoords)) {
      return [outCoords].concat(shortest.path).concat([inCoords]);
    }

    addToPath({ x: shortest.coords.x - 1, y: shortest.coords.y }, dict, heap,
      shortest.path, shortest.length, false);
    addToPath({ x: shortest.coords.x + 1, y: shortest.coords.y }, dict, heap,
      shortest.path, shortest.length, false);
    addToPath({ x: shortest.coords.x, y: shortest.coords.y - 1 }, dict, heap,
      shortest.path, shortest.length, false);
    addToPath({ x: shortest.coords.x, y: shortest.coords.y + 1 }, dict, heap,
      shortest.path, shortest.length, false);
    addToPath({ x: shortest.coords.x - 1, y: shortest.coords.y - 1 }, dict, heap,
      shortest.path, shortest.length, true);
    addToPath({ x: shortest.coords.x - 1, y: shortest.coords.y + 1 }, dict, heap,
      shortest.path, shortest.length, true);
    addToPath({ x: shortest.coords.x + 1, y: shortest.coords.y - 1 }, dict, heap,
      shortest.path, shortest.length, true);
    addToPath({ x: shortest.coords.x + 1, y: shortest.coords.y + 1 }, dict, heap,
      shortest.path, shortest.length, true);
  }
  // ASSERT: A path should always be findable.
  return null;
}

const toPoints = function(path) {
  let result = '';
  for (let coords of path) {
    const x = (coords.x * Consts.GRID) + (Consts.GRID / 2);
    const y = (coords.y * Consts.GRID) + (Consts.GRID / 2);
    result += toCoordsString({ x, y }) + ' ';
  }
  return result.slice(0, -1);
}

const addLinkElem = function(inPortElem, outPortElem) {
  // Remove any existing links first.
  const inPortLinkId = inPortElem.data('linkId');
  if (typeof inPortLinkId !== 'undefined') {
    Simulation.removeLink(inPortLinkId);
  }
  const outPortLinkId = outPortElem.data('linkId');
  if (typeof outPortLinkId !== 'undefined') {
    Simulation.removeLink(outPortLinkId);
  }

  const inPortCoords = getPortCoords(inPortElem);
  const inPortId = inPortElem.data('inPortId');
  const inNodeId = inPortElem.parent().data('nodeInfo').nodeId;
  const outPortCoords = getPortCoords(outPortElem);
  const outPortId = outPortElem.data('outPortId');
  const outNodeId = outPortElem.parent().data('nodeInfo').nodeId;
  const path = findPath(inPortCoords, outPortCoords);
  const link = $('#link-template').children().first().clone();
  link.children().first().attr('points', toPoints(path));
  link.appendTo(links);
  link.offset(grid.offset());
  const linkId = Simulation.addLink(outNodeId, outPortId, inNodeId, inPortId, link);
  link.data('linkInfo', {
    linkId,
    inPortElem,
    outPortElem,
  });
  inPortElem.data('linkId', linkId);
  outPortElem.data('linkId', linkId);
}

interact('.node-grabber')
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

      // Delete the node if it is dropped too far away from the grid.
      if (gridX < -Consts.NODE || gridY < -Consts.NODE ||
        gridX > map.length + Consts.NODE || gridY > Consts.HEIGHT + Consts.NODE) {
        removeNodeElem(target);
        return;
      }

      // Otherwise find nearest free space for node.
      // If no free space can be found, delete the node.
      let freeSpace = findFreeSpace({ x: gridX, y: gridY });
      if (freeSpace === null) {
        removeNodeElem(target);
        return;
      }
      gridX = freeSpace.x;
      gridY = freeSpace.y;

      // Move node to nearest free space.
      const coords = toPage(freeSpace);
      target.offset({ left: coords.x, top: coords.y });

      // Update nodeInfo, or create nodeInfo if new node was created.
      let nodeInfo = target.data('nodeInfo');
      if (typeof nodeInfo === 'undefined') {
        const def = target.data('def');
        const nodeId = Simulation.addNode(def.numInPorts, def.numOutPorts, def.logic, target);
        nodeInfo = { nodeId };
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

      // Redraw links if needed.
      const node = Simulation.getNode(nodeInfo.nodeId);
      for (let inPort of node.inPorts) {
        if (inPort.linkId !== null) {
          const link = Simulation.getLink(inPort.linkId).elem;
          const linkInfo = link.data('linkInfo');
          const path = findPath(getPortCoords(linkInfo.inPortElem), getPortCoords(linkInfo.outPortElem));
          link.children().first().attr('points', toPoints(path));
        }
      }
      for (let outPort of node.outPorts) {
        if (outPort.linkId !== null) {
          const link = Simulation.getLink(outPort.linkId).elem;
          const linkInfo = link.data('linkInfo');
          const path = findPath(getPortCoords(linkInfo.inPortElem), getPortCoords(linkInfo.outPortElem));
          link.children().first().attr('points', toPoints(path));
        }
      }
    }

  })

  .on('move', function(event) {
    const interaction = event.interaction;
    if (interaction.pointerIsDown && !interaction.interacting()) {
      let target = $(event.currentTarget).parent();
      if (target.hasClass('node-palette')) {
        const clone = target.clone(true);
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

interact('#nodes .node-port-in')
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
    ondrop(event) {
      const inPortElem = $(event.target);
      const outPortElem = $(event.relatedTarget);
      addLinkElem(inPortElem, outPortElem);
    }
  });

interact('#nodes .node-port-out')
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
    ondrop(event) {
      const inPortElem = $(event.relatedTarget);
      const outPortElem = $(event.target);
      addLinkElem(inPortElem, outPortElem);
    }
  });

$(document).ready(function() {
  // Dynamically resize grid.
  const square = $('#square');
  grid.height(Consts.GRID * Consts.HEIGHT + 1);
  square.attr('width', Consts.GRID);
  square.attr('height', Consts.GRID);
  square.children().attr('d', `M ${Consts.GRID} 0 L 0 0 0 ${Consts.GRID}`);
  resizeHandler();

  // TODO: Set up inputs palette.
  initPalette('#palette-inputs', [
    { numInPorts: 0, numOutPorts: 3, logic: (inputs) => inputs[0], icon: '#icon-and' },
  ]);

  // Set up logic gates palette.
  initPalette('#palette-gates', [
    { numInPorts: 2, numOutPorts: 1, logic: (inputs) => inputs[0] && inputs[1], icon: '#icon-and' },
    { numInPorts: 2, numOutPorts: 1, logic: (inputs) => inputs[0] || inputs[1], icon: '#icon-or' },
    { numInPorts: 1, numOutPorts: 1, logic: (inputs) => !inputs[0], icon: '#icon-not' },
  ]);

  // Set up passive palette.
  initPalette('#palette-passive', [
    { numInPorts: 1, numOutPorts: 3, logic: (inputs) => inputs[0], icon: '#icon-passive' },
  ]);

  // TODO: Set up outputs palette.
  initPalette('#palette-outputs', [
    { numInPorts: 1, numOutPorts: 0, logic: (inputs) => inputs[0], icon: '#icon-and' },
  ]);
});

$(window).resize(resizeHandler);
