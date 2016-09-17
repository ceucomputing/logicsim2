// Logic Gate Simulator
// Copyright (c) 2016 Ministry of Education, Singapore. All rights reserved.

/* global $:false, interact:false */

const Consts = {
  GRID: 20,
  HEIGHT: 20,
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

const resizeHandler = function() {
  const newWidth = Math.floor(grid.parent().width() / Consts.GRID) * Consts.GRID + 1;
  grid.width(newWidth);
}

$(document).ready(function() {
  const square = $('#square');
  grid.height(Consts.GRID * Consts.HEIGHT + 1);
  square.attr('width', Consts.GRID);
  square.attr('height', Consts.GRID);
  square.children().attr('d', `M ${Consts.GRID} 0 L 0 0 0 ${Consts.GRID}`);
  resizeHandler();
});

$(window).resize(resizeHandler);

interact('.node')
  .origin('#board')
  .draggable({

    restrict: {
      restriction: grid,
      endOnly: true,
      elementRect: { left: 0, right: 1, top: 0, bottom: 1 }
    },

    manualStart: true,

    snap: {
      targets: [
        function(x, y) {
          const offset = grid.offset();
          const newX =
            Math.round((x - 1.5 * Consts.GRID - offset.left) / Consts.GRID) * Consts.GRID +
            1.5 * Consts.GRID + offset.left;
          const newY =
            Math.round((y - 1.5 * Consts.GRID - offset.top) / Consts.GRID) * Consts.GRID +
            1.5 * Consts.GRID + offset.top;
          return { x: newX, y: newY }
        }
      ],
    },

    onmove(event) {
      const target = $(event.target);
      target.offset({
        left: event.pageX - 1.5 * Consts.GRID,
        top: event.pageY - 1.5 * Consts.GRID
      });
    }

  })

  .on('move', function(event) {
    const interaction = event.interaction;
    if (interaction.pointerIsDown && !interaction.interacting()) {
      let target = $(event.currentTarget);
      if (target.hasClass('node-palette')) {
        const clone = target.clone();
        clone.removeClass('node-palette');
        clone.appendTo('#nodes');
        clone.offset($(event.currentTarget).offset());
        target = clone;
      }
      interaction.start({ name: 'drag' }, event.interactable, target);
    }
  });
