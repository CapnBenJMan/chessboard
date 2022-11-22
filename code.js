let ID = x => document.getElementById(x),
	qry = (x, el = document) => el.querySelector(x),
	qryA = (x, el = document) => el.querySelectorAll(x),
	selected = '',
	/** Is it Player 1's turn? */ currentPlayer = true,
	row = 1


Object.forEach = function (o, callback) {
	for (let i in o) callback(o[i], i, o)
}

Object.map = function (o, callback) {
	const obj = {}
	for (let i in o) obj[i] = callback(o[i], i, o)
	return obj
}

const ls = {
	sg: 'CaptainBenJManChessboardSavedGame',
	ml: 'CaptainBenJManChessboardMoveList',
	html: 'CaptainBenJManChessboardMLHTML',
	config: 'CaptainBenJManChessboardConfigData'
},
	co0 = ls.config in localStorage ? JSON.parse(localStorage[ls.config]) : undefined,
	co = co0 != undefined ? Object.map(co0, x => typeof x == 'boolean' ? x : new Color(x.red, x.green, x.blue)) : undefined,
	configOptions = co != undefined ? co : {
		color1: new Color(255, 255, 255), color2: new Color(0, 0, 0),
		move: Color.from('#008000'), take: Color.from('#8b0000'),
		usePride: false
	},
	letters = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h' },
	{ color1, color2 } = configOptions,
	GameBoard = ls.sg in localStorage ?
		Board.from(localStorage[ls.sg], color1, color2) :
		new Board(new Color(255, 255, 255), new Color(0, 0, 0)),
	root = document.documentElement.style,
	/**
	 * @type {{start: string, piece: Pawn|Rook|Knight|Bishop|Queen|King,
	 * end: string, castle?: boolean, check?: string, swap?: boolean
	 * taken?: Pawn|Rook|Knight|Bishop|Queen|King}[]} 
	*/
	moveList = ls.ml in localStorage ? parseMoves() : []

document.addEventListener("DOMContentLoaded", () => {
	const board = ID('chessboard')
	setRootProperties()

	Array.from(['configP1', 'configP2', 'configMove', 'configTake'])
		.forEach(x => {
			if (Number.isNaN(Number(x.slice(-1)))) ID(x).value = configOptions[x.slice(-4).toLowerCase()].hex
			else ID(x).value = configOptions[`color${x.slice(-1)}`].hex
		})

	for (let row = 8; row >= 1; row--) for (let col = 1; col <= 8; col++) {
		const el = document.createElement("div")
		el.id = `${letters[col]}${row}`
		el.style.gridArea = `_${row}x${col}`
		const /** @type {Pawn|Rook|Knight|Bishop|Queen|King|undefined} */
			piece = GameBoard.grid?.[`${letters[col]}${row}`]
		el.classList.add((row + col) % 2 == 1 ? 'light' : 'dark', 'tile')
		if (piece != undefined && 'name' in piece && 'pN' in piece) el.classList.add(piece.name, `p${piece.pN}`)
		el.innerHTML = `<span></span>`
		el.onclick = computeMoves
		board.appendChild(el)
	}

	const moves = ID('moves')
	if (moveList.length > 0) ID(lastMove().end).classList.add('last')
	if (ls.html in localStorage) {
		moves.innerHTML = localStorage[ls.html]
		currentPlayer = !Boolean(moves.childElementCount % 2)
	}
	if (GameBoard.checkForCheck()) {
		const dangerPlayer = currentPlayer ? 1 : 2,
			kingCoord = GameBoard.findPieceInGrid('king', dangerPlayer)
		ID(kingCoord).classList.add('check')
		moveList[moveList.length - 1].check = `p${dangerPlayer}`
	}
	row = Math.floor(moves.childElementCount / 2) + 1
})

document.onkeydown = e => {
	const evtobj = e
	if (evtobj.key == 'z' && evtobj.ctrlKey) alert("Ctrl+z")
}

let pawnSwap = false
/** @this {HTMLDivElement} */
async function computeMoves() {
	const doHighlight = async () => {
		qryA('div.tile').forEach(x => x.classList.remove('move', 'take', 'castle'))
		const ks = Object.keys(GameBoard.grid),
			p = (currentPlayer) ? 'p1' : 'p2'
		if (this.classList.contains(p) && selected != this.id && ks.includes(this.id)) {
			const /** @type {Pawn|Rook|Knight|Bishop|Queen|King|undefined} */
				piece = GameBoard.grid[this.id],
				moves = piece?.moves,
				takes = piece?.takes,
				castles = piece?.castles
			if (moves != undefined) moves.forEach(x => ID(x).classList.add('move'))
			if (takes != undefined) takes.forEach(x => ID(x).classList.add('take'))
			if (castles != undefined) castles.forEach(x => ID(x).classList.add('castle'))
		}
		selected = selected == this.id ? '' : this.id
	}
	const doMove = async (castle = false) => {
		currentPlayer = !currentPlayer
		const classes = ['move', 'take', 'last', 'castle'].filter(x => {
			if (castle && x == 'last') return false
			return true
		})
		qryA('div.tile').forEach(x => x.classList.remove(...classes))
		const sel = castle ? { 'g1': 'h1', 'c1': 'a1', 'g8': 'h8', 'c8': 'a8' }[lastMove().end] : selected,
			end = castle ? { 'g1': 'f1', 'c1': 'd1', 'g8': 'f8', 'c8': 'd8' }[this.id] : this.id
		removePieceFromDOM(sel)
		const piece0 = GameBoard.grid[sel],
			[piece, __] = await GameBoard.move(sel, end)
		moveList.push({
			start: sel,
			piece: piece0,
			end: end,
			castle,
			swap: pawnSwap
		})
		addPieceToDOM(piece.name, piece.pN, end)
		selected = ''
	}
	const doTake = async () => {
		currentPlayer = !currentPlayer
		qryA('div.tile').forEach(x => x.classList.remove('move', 'take', 'last', 'castle'))
		removePieceFromDOM(selected, this.id)
		const piece0 = GameBoard.grid[selected],
			[piece, taken] = await GameBoard.move(selected, this.id)
		moveList.push({
			start: selected,
			piece: piece0,
			end: this.id,
			taken,
			swap: pawnSwap
		})
		addPieceToDOM(piece.name, piece.pN, this.id)
		selected = ''
	}
	const doCastle = async () => {
		qryA('div.tile').forEach(x => x.classList.remove('move', 'take', 'last', 'castle'))
		removePieceFromDOM(selected)
		const piece0 = GameBoard.grid[selected],
			[piece, __] = await GameBoard.move(selected, this.id)
		moveList.push({
			start: selected,
			piece: piece0,
			end: this.id
		})
		this.classList.add('last')
		addPieceToDOM(piece.name, piece.pN, this.id)
		selected = ''
	}

	new Promise((res, rej) => {
		if (this.classList.contains('move')) doMove().then(() => res())
		else if (this.classList.contains('take')) doTake().then(() => res())
		else if (this.classList.contains('castle')) doCastle().then(() => doMove(true).then(() => res()))
		else doHighlight().then(() => rej())

	}).then(async () => {
		const lmove = lastMove()
		if (!('castle' in lmove) || ('castle' in lmove && !lmove.castle)) ID(lmove.end).classList.add('last')
		qryA('.check').forEach(x => x.classList.remove('check'))
		const cPlayer = currentPlayer ? 2 : 1,
			dPlayer = currentPlayer ? 1 : 2,
			cond1 = (GameBoard.checkForCheck(cPlayer) || GameBoard.checkForCastle(cPlayer)),
			cond2 = GameBoard.checkForCheck(dPlayer)
		if (cond1) {
			undo(true).then(() => {
				const king = ID(GameBoard.findPieceInGrid('king', cPlayer)),
					int = setInterval(() => king.classList.toggle('check'), 100)
				setTimeout(() => clearInterval(int), 600)
			})
		} else if (cond2) {
			const kingCoord = GameBoard.findPieceInGrid('king', dPlayer)
			ID(kingCoord).classList.add('check')
			GameBoard.grid[kingCoord].canCastle = false
			moveList[moveList.length - 1].check = `p${dPlayer}`
			if (await GameBoard.checkforCheckmate(dPlayer)) {
				ID('winner').innerHTML = `Congratulations, Player ${cPlayer}!<br>You Win!`
				ID('winscreen').classList.remove('magic')
			}
		}
		localStorage[ls.sg] = GameBoard.stringify
		localStorage[ls.ml] = stringifyMoves()
		if (!cond1) parseNotation()
	}).catch(() => { })
}

function removePieceFromDOM(...coords) {
	for (let coord of coords)
		if (coord in GameBoard.grid) {
			const pieces = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'],
				pN = ['p1', 'p2'],
				tile = ID(coord)
			tile.classList.remove(...pieces, ...pN)
		}
}

/** @param {string} coord @param {piecenames} name */
function addPieceToDOM(name, player, ...coords) {
	for (let coord of coords) {
		if ([1, 2].some(x => x == player) && GameBoard.valRange(coord) &&
			!ID(coord).classList.contains(name)) {
			const tile = ID(coord)
			tile.classList.add(name, `p${player}`)
		}
	}
}

var swapResolve
/** @param {Pawn|Rook|Knight|Bishop|Queen|King} piece */
async function doPawnSwap(piece) {
	const swaps = [ID('pawnSwap'), ID('pawnSwapBack')]
	swaps[0].classList.add(`p${piece.pN}`)
	swaps.forEach(x => x.classList.remove('magic'))
	const choice = await (new Promise(res => swapResolve = res))
	const newPiece = GameBoard.swap(piece, piece.coord, choice)
	swaps.forEach(x => x.classList.add('magic'))
	swaps[0].classList.remove(`p${piece.pN}`)
	removePieceFromDOM(piece.coord)
	addPieceToDOM(choice, piece.pN, piece.coord)
	pawnSwap = true
	return newPiece
}

async function undo(bool = false) {
	if (moveList.length == 0) return
	qryA('.tile').forEach(x => x.classList.remove('check', 'move', 'take'))
	const moves = lastMove()
	if (!('castle' in moves) || !moves.castle) qry('.last').classList.remove('last')
	removePieceFromDOM(moves.end)
	if ('swap' in moves && moves.swap) GameBoard.grid[moves.end] = moves.piece
	GameBoard.move(moves.end, moves.start).then(pieces => {
		const piece = pieces[0]
		addPieceToDOM(piece.name, piece.pN, piece.coord)
		if ("taken" in moves) {
			const { taken } = moves
			GameBoard.grid[moves.end] = taken
			addPieceToDOM(taken.name, taken.pN, taken.coord)
		}
		currentPlayer = !currentPlayer
		const id = moves.piece.id,
			p = moves.piece.pN

		const moveElements = Array.from(ID('moves').childNodes).slice(0, -1).filter((x, i) => i != 0)
		for (let a of [0, 1]) {
			const subArray = moveElements.filter((x, i) => i % 2 == a)
			subArray.forEach(x => {
				const span = Array.from(x.childNodes)[0],
					kingXY = GameBoard.findPieceInGrid('king', a + 1)
				GameBoard.grid[kingXY].canCastle = !span.innerHTML.includes('+')
			})
		}
		if (['king', 'rook'].some(x => piece.name == x) &&
			moveList.filter(x => x.piece.id == id).length <= 1) {
			GameBoard.grid[moves.start].canCastle = true
		}
		moveList.pop()
		if ('castle' in moves && moves.castle) {
			currentPlayer = !currentPlayer
			undo()
			return
		}
		if (moveList.length > 0) {
			const lmove = lastMove()
			if (!('castle' in lmove) || !lmove.castle)
				ID(lmove.end).classList.add('last')
			else ID(lastMove(2).end).classList.add('last')
		}
		if (GameBoard.checkForCheck()) {
			const dangerPlayer = currentPlayer ? 1 : 2,
				kingCoord = GameBoard.findPieceInGrid('king', dangerPlayer)
			ID(kingCoord).classList.add('check')
			moveList[moveList.length - 1].check = `p${dangerPlayer}`
		}
		const Moves = ID('moves'),
			numMoves = moveList.length - moveList.filter(x => 'castle' in x && x.castle).length
		while (Moves.childElementCount > numMoves) Moves.removeChild(Moves.lastElementChild)
		localStorage[ls.sg] = GameBoard.stringify
		localStorage[ls.ml] = stringifyMoves()
		localStorage[ls.html] = Moves.innerHTML
		row = Math.floor(Moves.childElementCount / 2) + 1
		if (moveList.length == 0) {
			delete localStorage[ls.ml]
			delete localStorage[ls.html]
		}
	})
	return
}

function lastMove(x = 1) {
	return moveList[moveList.length - x]
}

async function parseNotation() {
	const parsed = await parser(),
		moves = ID('moves'),
		cell = document.createElement('div')
	cell.innerHTML = `<span>${parsed}</span>`
	if (!(moves.childElementCount % 2)) cell.dataset.row = `${row++}.`
	moves.appendChild(cell)
	localStorage[ls.html] = moves.innerHTML
	pawnSwap = false

	async function parser() {
		const last = lastMove()

		// check for castle
		if ('castle' in last && last.castle) {
			return [1, 8].some(x => `f${x}` == last.end) ? 'O-O' : 'O-O-O'
		}

		const letters = { 'rook': 'R', 'knight': 'N', 'bishop': 'B', 'queen': 'Q', 'king': 'K' },
			take = 'taken' in last,
			dPlayer = currentPlayer ? 1 : 2,
			pawnTake = (take && last.piece.name == 'pawn') ? last.start[0] : '',
			piece = letters[last.piece.name] ?? '',
			taken = take ? 'x' : '',
			end = last.end,
			promote = pawnSwap ?
				`=${letters[GameBoard.grid[last.end].name]}` : '',
			check = (await GameBoard.checkforCheckmate(dPlayer)) ? '#' : GameBoard.checkForCheck() ? '+' : ''
		return pawnTake + piece + taken + end + promote + check
	}
}

function clearSaveData() {
	delete localStorage[ls.sg]
	delete localStorage[ls.ml]
	delete localStorage[ls.html]
	location.reload()
}

function stringifyMoves() {
	return moveList.reduce((str, cur) => {
		const obj = {
			start: cur.start,
			end: cur.end,
			piece: cur.piece.stringify
		}
		if ('castle' in cur) obj.castle = cur.castle
		if ('taken' in cur) obj.taken = cur.taken.stringify
		return str + `${JSON.stringify(obj)} | `
	}, '').slice(0, -3)
}

function parseMoves() {
	const /** @type {string} */ string = localStorage[ls.ml],
		classes = { 'pawn': Pawn, 'rook': Rook, 'knight': Knight, 'bishop': Bishop, 'queen': Queen, 'king': King }
	return string.split(' | ').map(x => {
		const obj1 = JSON.parse(x),
			piece = JSON.parse(obj1.piece),
			obj2 = { ...obj1, piece: classes[piece.name].from(piece, GameBoard) }
		if ('taken' in obj1) {
			const taken = JSON.parse(obj1.taken)
			obj2.taken = classes[taken.name].from(taken, GameBoard)
		}
		return obj2
	})
}

function openConfig() {
	[ID('configScreen'), ID('pawnSwapBack')].forEach(x => x.classList.remove('magic'))
}
function closeConfig() {
	[ID('configScreen'), ID('pawnSwapBack')].forEach(x => x.classList.add('magic'))
}

function setRootProperties() {
	const { color1, color2, move, take } = configOptions
	GameBoard.player1 = color1
	GameBoard.player2 = color2
	const { player1, player2, dark, light } = GameBoard
	root.setProperty('--darkercolor', dark.hex)
	root.setProperty('--lightercolor', light.hex)
	root.setProperty('--player1back', player1.invert().hex)
	root.setProperty('--player2back', player2.invert().hex)
	root.setProperty('--player1', player1.hex)
	root.setProperty('--player2', player2.hex)
	root.setProperty('--midcolor', Color.diff(player1, player2).hex)
	root.setProperty('--lightmove', move.hex)
	root.setProperty('--darkmove', move.darken().darken().hex)
	root.setProperty('--lighttake', take.lighten().lighten().hex)
	root.setProperty('--darktake', take.hex)
}

/** {HTMLInputElement} */
function setConfig(elem) {
	console.log(elem.value)
	switch (elem.id) {
		case 'configP1':
			configOptions.color1 = Color.from(elem.value)
			break
		case 'configP2':
			configOptions.color2 = Color.from(elem.value)
			break
		case 'configMove':
			configOptions.move = Color.from(elem.value)
			break
		case 'configTake':
			configOptions.take = Color.from(elem.value)
			break
	}
	localStorage[ls.config] = JSON.stringify(configOptions)
	setRootProperties()
}

function resetConfig() {
	const initialValues = {
		color1: new Color(255, 255, 255), color2: new Color(0, 0, 0),
		move: Color.from('#008000'), take: Color.from('#8b0000'),
		usePride: false
	}
	Object.forEach(initialValues, (x, i) => configOptions[i] = x)
	Array.from(['configP1', 'configP2', 'configMove', 'configTake'])
		.forEach(x => {
			if (Number.isNaN(Number(x.slice(-1)))) ID(x).value = configOptions[x.slice(-4).toLowerCase()].hex
			else ID(x).value = configOptions[`color${x.slice(-1)}`].hex
		})
	localStorage[ls.config] = JSON.stringify(configOptions)
	setRootProperties()
}

function startNewGame() {
	delete localStorage[ls.sg]
	delete localStorage[ls.html]
	delete localStorage[ls.ml]
	location.reload()
}

function viewBoard() {
	ID('winscreen').classList.add('magic')
}