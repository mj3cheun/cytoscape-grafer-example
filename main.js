import cytoscape from 'cytoscape';
import { GraferController, UX, graph } from '@uncharted.software/grafer';

import index from './index.json';
import corpus from './corpus.json';
import speakers from './speakers.json';
async function getUtterances() {
    const response = await fetch('./utterances.jsonl');
    return await response.text();
}
const filteredMovieIds = [
    'm13', 'm12'
].reduce((o, id) => {o[id] = true; return o;}, {});
const utterances = (await getUtterances())
    .split('\n')
    .filter(str => str)
    .map(obj => JSON.parse(obj))
    .filter(utterance => filteredMovieIds[utterance.meta.movie_id]);
const utterancesById = utterances.reduce((obj, utterance) => {
    obj[utterance.id] = utterance;
    return obj;
}, {});

const nodesBySpeaker = {};
utterances.forEach(utterance => {
    nodesBySpeaker[utterance.speaker] = {id: utterance.speaker, ...speakers[utterance.speaker].meta};
});
const nodes = Object.values(nodesBySpeaker);
const edges = [];
utterances.forEach(utterance => {
    const speaker = utterance.speaker;
    const replyTo = utterance['reply-to'];

    if(speaker && replyTo) {
        edges.push({
            id: utterance.id,
            text: utterance.text,
            speaker,
            replyToSpeaker: utterancesById[replyTo].speaker,
            replyToText: utterancesById[replyTo].text,
            source: speaker,
            target: utterancesById[replyTo].speaker
        });
    }
});
const elements = {
    nodes: nodes.map(node => ({data: node})),
    edges: edges.map(edge => ({data: edge})),
};
// console.log(elements);

const cy = cytoscape({
    headless: true,
    styleEnabled: false,
    elements
});
cy.layout({
    name: 'breadthfirst',
  
    fit: true, // whether to fit the viewport to the graph
    directed: false, // whether the tree is directed downwards (or edges can point in any direction if false)
    padding: 30, // padding on fit
    circle: true, // put depths in concentric circles if true, put depths top down if false
    grid: false, // whether to create an even grid into which the DAG is placed (circle:false only)
    spacingFactor: 1.75, // positive spacing factor, larger => more space between nodes (N.B. n/a if causes overlap)
    boundingBox: undefined, // constrain layout bounds; { x1, y1, x2, y2 } or { x1, y1, w, h }
    avoidOverlap: true, // prevents node overlap, may overflow boundingBox if not enough space
    nodeDimensionsIncludeLabels: false, // Excludes the label when calculating node bounding boxes for the layout algorithm
    roots: undefined, // the roots of the trees
    depthSort: undefined, // a sorting function to order nodes at equal depth. e.g. function(a, b){ return a.data('weight') - b.data('weight') }
    animate: false, // whether to transition the node positions
    animationDuration: 500, // duration of animation in ms if enabled
    animationEasing: undefined, // easing of animation if enabled,
    animateFilter: function ( node, i ){ return false; }, // a function that determines whether the node should be animated.  All nodes animated by default on animate enabled.  Non-animated nodes are positioned immediately when the layout starts
    ready: undefined, // callback on layoutready
    stop: undefined, // callback on layoutstop
    transform: function (node, position ){ return position; } // transform a given node position. Useful for changing flow direction in discrete layouts
}).run();
cy.nodes().map((node, idx) => {
    nodes[idx] = {...nodes[idx], ...node.position(), point: nodes[idx].id, radius: 0.3};
});

console.log(nodes);
console.log(edges);

const canvas = document.querySelector('.grafer_container');

function capitalizeFirstLetter(string) {
    return string.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}
const layers = [
    {
        nodes: {data: nodes},
        edges: {
            data: edges,
            options: {
                alpha: 0.01,
                lineWidth: 3,
                blendMode: 2
            },
        },
        labels: {
            data: nodes,
            mappings: {
                label: (datum) => capitalizeFirstLetter(datum.character_name),
                fontSize: () => 14,
            },
            options: {
                font: 'Arial',
                labelPlacement: graph.labels.PointLabelPlacement.TOP,
            }
        },
    },
];

const controller = new GraferController(canvas, { points: {data: nodes}, layers });
new UX.DebugMenu(controller.viewport);