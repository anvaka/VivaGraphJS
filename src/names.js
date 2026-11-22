/**
 * Whether the nodes of a graph have names worth drawing as labels: at least half of them (of the
 * first 200) have a `label` or a `name` in their data, or an id that is a word rather than a
 * number (`graph.addLink('Alice', 'Bob')`). A graph of numbered nodes gets no labels by default;
 * its tooltips still show the ids.
 */
export function hasNames(graph) {
  let named = 0, seen = 0;
  graph.forEachNode(node => {
    seen += 1;
    let data = node.data;
    if ((data && (isName(data.label) || isName(data.name))) || isWord(node.id)) named += 1;
    return seen >= 200;
  });
  return seen > 0 && named >= seen / 2;
}

function isWord(id) {
  return typeof id === 'string' && id.length > 0 && !/^[-+]?\d+(\.\d+)?$/.test(id.trim());
}

function isName(value) {
  return typeof value === 'string' && value.length > 0;
}
