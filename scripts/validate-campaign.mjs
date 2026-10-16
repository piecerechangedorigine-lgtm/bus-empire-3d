const templates = [
  [[1,2,2,'v'],[1,4,2,'v'],[1,5,2,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,4,2,'v'],[4,2,2,'v']],
  [[1,2,2,'v'],[1,3,2,'v'],[1,5,2,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,4,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']],
  [[1,2,2,'v'],[1,4,3,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']],
  [[1,2,2,'v'],[1,4,2,'v'],[1,5,3,'v'],[3,0,2,'v'],[3,1,2,'v'],[3,3,2,'v'],[4,2,2,'v'],[4,4,2,'v'],[0,0,2,'v']]
];

function cells(vehicle, row = vehicle.row, col = vehicle.col) {
  return Array.from({length: vehicle.len}, (_, k) => [
    row + (vehicle.dir === 'v' ? k : 0),
    col + (vehicle.dir === 'h' ? k : 0)
  ]);
}
function key([row, col]) { return row + ',' + col; }

function createLevel(levelIndex) {
  const difficulty = levelIndex % 10 + 1;
  const vehicles = [
    {id:'goal',row:2,col:0,len:2,dir:'h',goal:true},
    {id:'queueTop',row:0,col:2,len:2,dir:'h',goal:false}
  ];
  const occupied = new Set(vehicles.flatMap(v => cells(v).map(key)));
  let idx = 0;
  const template = templates[Math.min(3, Math.floor((difficulty - 1) / 3))];
  for (const [row,col,len,dir] of template) {
    if (idx > 5) break;
    if (row < 0 || col < 0 || row + (dir === 'v' ? len - 1 : 0) > 5 || col + (dir === 'h' ? len - 1 : 0) > 5) continue;
    const vehicle = {id:'v'+idx,row,col,len,dir,goal:false};
    const occupiedCells = cells(vehicle).map(key);
    if (occupiedCells.some(cell => occupied.has(cell))) continue;
    vehicles.push(vehicle);
    occupiedCells.forEach(cell => occupied.add(cell));
    idx++;
  }
  return vehicles;
}

function solve(vehicles) {
  const initial = vehicles.map(v => [v.row, v.col]);
  const signature = state => state.map(([r,c]) => r + ',' + c).join('|');
  const queue = [{state:initial, distance:0}];
  const seen = new Set([signature(initial)]);
  const meta = vehicles.map(v => ({len:v.len,dir:v.dir,goal:v.goal}));
  for (let head = 0; head < queue.length; head++) {
    const {state,distance} = queue[head];
    if (state[0][1] + meta[0].len > 5) return distance;
    const occupied = new Set();
    state.forEach(([row,col], i) => cells({...meta[i],row,col}).forEach(cell => occupied.add(key(cell))));
    for (let i = 0; i < state.length; i++) {
      const [row,col] = state[i], {len,dir,goal} = meta[i];
      const own = new Set(cells({...meta[i],row,col}).map(key));
      const others = new Set([...occupied].filter(cell => !own.has(cell)));
      for (const sign of [-1,1]) {
        for (let step = 1; step <= 6; step++) {
          const nextRow = row + (dir === 'v' ? sign * step : 0);
          const nextCol = col + (dir === 'h' ? sign * step : 0);
          if (nextRow < 0 || nextRow + (dir === 'v' ? len - 1 : 0) > 5 || nextCol < 0 || (!goal && nextCol + (dir === 'h' ? len - 1 : 0) > 5)) break;
          const nextCells = cells({...meta[i],row:nextRow,col:nextCol}).map(key);
          if (nextCells.some(cell => others.has(cell))) break;
          const next = state.map(pos => [...pos]);
          next[i] = [nextRow,nextCol];
          if (goal && nextCol + len > 5) return distance + 1;
          const sig = signature(next);
          if (!seen.has(sig)) {
            seen.add(sig);
            queue.push({state:next,distance:distance+1});
          }
        }
      }
    }
  }
  return null;
}

const failures = [];
for (let level = 0; level < 30; level++) {
  const vehicles = createLevel(level);
  const moves = solve(vehicles);
  if (moves === null) failures.push('Level ' + (level + 1) + ' is not solvable');
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Campaign validation passed: all 30 levels are solvable.');
}
