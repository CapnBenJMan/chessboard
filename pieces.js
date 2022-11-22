/** 
 * @typedef {Pawn|Rook|Knight|Bishop|Queen|King} gamepieces 
 * @typedef {("pawn"|"rook"|"knight"|"bishop"|"queen"|"king")} piecenames
*/

function* idMaker() {
	for (let i = 0; ; i++) yield i++
}

const ids = idMaker()

class Color {
	/** @param {number} r @param {number} g @param {number} b */
	constructor(r, g, b) {
		this.red = r
		this.green = g
		this.blue = b
		return this
	}

	get xS() {
		return `${this.red};${this.green};${this.blue}`
	}

	get rgb() {
		return `rgb(${this.red}, ${this.green}, ${this.blue})`
	}

	get hex() {
		const [r, g, b] = ['red', 'green', 'blue'].map(x => `0${this[x].toString(16)}`.slice(-2))
		return `#${r}${g}${b}`
	}

	darken() {
		const f = n => Math.max(n, 0)
		return new Color(f(this.red - 25), f(this.green - 25), f(this.blue - 25))
	}

	lighten() {
		const m = n => Math.min(n, 255)
		return new Color(m(this.red + 25), m(this.green + 25), m(this.blue + 25))
	}

	invert() {
		return new Color(255 - this.red, 255 - this.green, 255 - this.blue)
	}

	/** @param {Color} c1 @param {Color} c2 */
	static darker(c1, c2) {
		if ((c1.red + c1.green + c1.blue) > (c2.red + c2.green + c2.blue)) return c2
		return c1
	}

	/** @param {Color} c1 @param {Color} c2 */
	static lighter(c1, c2) {
		if ((c1.red + c1.green + c1.blue) > (c2.red + c2.green + c2.blue)) return c1
		return c2
	}

	/** @param {string} str */
	static from(str) {
		if (str[0] == '#') {
			const r = parseInt(str.slice(1, 3), 16),
				g = parseInt(str.slice(3, 5), 16),
				b = parseInt(str.slice(5), 16)
			return new Color(r, g, b)
		}
	}

	/** @param {Color} c1 @param {Color} c2 */
	static diff(c1, c2) {
		const { red: r1, green: g1, blue: b1 } = c1,
			{ red: r2, green: g2, blue: b2 } = c2,
			[r, g, b] = [r1 + r2, g1 + g2, b1 + b2].map(x => Math.floor(x / 2))

		return new Color(r, g, b)
	}
}

class Piece {
	/** @param {Color} color @param {string} coord @param {1|2} player @param {string} name @param {Board} board */
	constructor(color, coord, player, name, board) {
		this.coord = coord
		this.color = color
		this.pN = player
		this.player = `player${player}`
		this.name = name
		this.board = board
		this.id = ids.next().value
	}

	get row() {
		return Number(this.coord[1])
	}

	get col() {
		return this.coord.charCodeAt(0) - 96
	}

	getXY(row, col) {
		return `${this.letters[col]}${row}`
	}

	/** @param {string} coord */
	getRowCol(coord) {
		if (this.valRange(coord)) return [coord.charCodeAt(0) - 96, Number(coord[1])]
	}

	/** @param {string} x */
	valRange(x) {
		return !x.includes('undefined') && x.match(/-?\d+/)[0].length == 1 &&
			this.numbers.some(y => x.includes(String(y)))
	}

	/** @param {{coord: (r: any, c: any) => string,blocked: boolean}[]} paths0 */
	pathfinder(paths0) {
		const arr = [],
			paths = paths0
		paths.forEach(path => {
			for (let i = 1; i <= 7; i++)
				if (!path.blocked) {
					const XY = path.coord(i, i)
					path.blocked = XY in this.board.grid
					if (!path.blocked && this.valRange(XY)) arr.push(XY)
				}
		})
		paths.forEach(path => path.blocked = false)
		return arr
	}

	/** @param {{coord: (r: any, c: any) => string,blocked: boolean}[]} paths0 */
	takefinder(paths0) {
		const arr = [],
			paths = paths0
		paths.forEach(path => {
			for (let i = 1; i <= 7; i++) {
				if (path.blocked) continue
				const XY = path.coord(i, i)
				if (this.valRange(XY) && XY in this.board.grid) {
					if (this.board.grid[XY].player != this.player) arr.push([XY, path])
					path.blocked = true
				}
			}
		})
		paths.forEach(path => path.blocked = false)
		return arr
	}

	get stringify() {
		return JSON.stringify(
			Object.keys(this).filter(x => !['board', 'letters', 'numbers', 'paths', 'moveset'].some(y => x == y)).reduce((obj, cur) => {
				obj[cur] = this[cur]
				return obj
			}, {}))
	}

	static from(obj, board) {
		const { red, green, blue } = obj.color,
			color = new Color(red, green, blue)
		return new this(color, obj.coord, obj.pN, board)
	}

	letters = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h' }
	numbers = [1, 2, 3, 4, 5, 6, 7, 8]
}

class Pawn extends Piece {
	/** @param {Color} color @param {string} coord */
	constructor(color, coord, player, board) {
		super(color, coord, player, 'pawn', board)
		return this
	}

	get moves() {
		const bool = this.player == 'player1',
			c = n => (bool ? 1 : -1) * n,
			start = bool ? 2 : 7,
			arr = [this.getXY(this.row + c(1), this.col)]
		if (this.row == start && !(arr[0] in this.board.grid)) arr.push(this.getXY(this.row + c(2), this.col))
		return arr.filter(x => !(x in this.board.grid))
	}

	get takes() {
		const bool = this.player == 'player1',
			c = n => (bool ? 1 : -1) * n
		return [1, -1].map(x => this.getXY(this.row + c(1), this.col + x))
			.filter(x => !x.includes('undefined') && x in this.board.grid &&
				this.board.grid[x].player != this.player)
	}
}

class Rook extends Piece {
	constructor(color, coord, player, board) {
		super(color, coord, player, 'rook', board)
		return this
	}

	paths = [
		{
			coord: (_, c) => this.getXY(this.row, this.col + c),
			blocked: false
		},
		{
			coord: (r, _) => this.getXY(this.row + r, this.col),
			blocked: false
		},
		{
			coord: (_, c) => this.getXY(this.row, this.col - c),
			blocked: false
		},
		{
			coord: (r, _) => this.getXY(this.row - r, this.col),
			blocked: false
		},
	]

	canCastle = true

	get moves() {
		return this.pathfinder(this.paths)
	}

	get takes() {
		return this.takefinder(this.paths).map(x => x[0])
	}
}

class Knight extends Piece {
	constructor(color, coord, player, board) {
		super(color, coord, player, 'knight', board)
		return this
	}

	moveset = [[1, -2], [-1, -2], [2, -1], [2, 1], [1, 2], [-1, 2], [-2, -1], [-2, 1]]

	get moves() {
		return this.moveset
			.map(x => this.getXY(this.row + x[0], this.col + x[1]))
			.filter(x => this.valRange(x))
			.filter(x => !(x in this.board.grid))

	}

	get takes() {
		return this.moveset
			.map(x => this.getXY(this.row + x[0], this.col + x[1]))
			.filter(x => this.valRange(x))
			.filter(x => x in this.board.grid && this.board.grid[x].player != this.player)
	}
}

class Bishop extends Piece {
	constructor(color, coord, player, board) {
		super(color, coord, player, 'bishop', board)
		return this
	}
	paths = [
		{
			coord: (r, c) => this.getXY(this.row + r, this.col + c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row + r, this.col - c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row - r, this.col - c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row - r, this.col + c),
			blocked: false
		},
	]
	get moves() {
		return this.pathfinder(this.paths).filter(x => this.valRange(x))
	}

	get takes() {
		return this.takefinder(this.paths).map(x => x[0])
	}
}

class Queen extends Piece {
	constructor(color, coord, player, board) {
		super(color, coord, player, 'queen', board)
		return this
	}

	paths = [
		{
			coord: (r, c) => this.getXY(this.row, this.col + c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row + r, this.col),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row, this.col - c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row - r, this.col),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row + r, this.col + c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row + r, this.col - c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row - r, this.col - c),
			blocked: false
		},
		{
			coord: (r, c) => this.getXY(this.row - r, this.col + c),
			blocked: false
		}
	]

	get moves() {
		return this.pathfinder(this.paths).filter(x => this.valRange(x))
	}

	get takes() {
		return this.takefinder(this.paths).map(x => x[0])
	}
}

class King extends Piece {
	constructor(color, coord, player, board) {
		super(color, coord, player, 'king', board)
		return this
	}

	canCastle = true

	moveset = [[1, 1], [1, 0], [1, -1], [0, 1], [0, -1], [-1, 1], [-1, 0], [-1, -1]]

	get moves() {
		return this.moveset.map(x => this.getXY(this.row + x[0], this.col + x[1]))
			.filter(x => this.valRange(x))
			.filter(x => !(x in this.board.grid))
	}

	get takes() {
		return this.moveset.map(x => this.getXY(this.row + x[0], this.col + x[1]))
			.filter(x => this.valRange(x))
			.filter(x => x in this.board.grid && this.board.grid[x].player != this.player)
	}

	get castles() {
		const arr = []
		if (this.col == 5 && this.canCastle) {
			/** @param {string} coord */
			let canDO = (coord, a, b) => {
				if (coord in this.board.grid) {
					const piece = this.board.grid[coord]
					if (piece.canCastle && piece.moves.includes(this.getXY(this.row, a)))
						arr.push(this.getXY(this.row, b))
				}
			}
			[[this.getXY(this.row, 1), 4, 3],
			[this.getXY(this.row, 8), 6, 7]]
				.forEach(x => canDO(x[0], x[1], x[2]))
		}
		return arr
	}
}

class Board {
	/** @param {Color} p1 @param {Color} p2 */
	constructor(p1, p2, from = false) {
		this.player1 = p1
		this.player2 = p2
		/**
		 * @type {{[x: string]: Pawn|Rook|Knight|Bishop|Queen|King}}
		 * @public
		 */
		this.grid = {}
		if (!from)
			for (let row of this.#numbers) for (let col0 in this.#letters) {
				const col = this.#letters[col0]
				if (![1, 2, 7, 8].some(x => x == row)) continue

				const [color, player] = ([1, 2].some(x => x == row)) ? [this.player1, 1] : [this.player2, 2],
					coord = `${col}${row}`
				switch (row) {
					case 1:
					case 8:
						switch (col) {
							case 'a': // rook
							case 'h': // ^^^
								this.grid[coord] = new Rook(color, coord, player, this)
								break
							case 'b': // knight
							case 'g': // ^^^
								this.grid[coord] = new Knight(color, coord, player, this)
								break
							case 'c': // bishop
							case 'f': // ^^^
								this.grid[coord] = new Bishop(color, coord, player, this)
								break
							case 'd': // queen
								this.grid[coord] = new Queen(color, coord, player, this)
								break
							case 'e': // king
								this.grid[coord] = new King(color, coord, player, this)
								break
						}
						break
					case 2:
					case 7:
						this.grid[coord] = new Pawn(color, coord, player, this)
						break
				}
			}
		return this
	}

	/** @param {string} x */
	valRange(x) {
		return !x.includes('undefined') &&
			x.match(/-?\d+/)[0].length == 1 &&
			this.#numbers.some(y => x.includes(String(y))) &&
			Object.values(this.#letters).includes(x.match(/[A-z]+/)[0])
	}

	/** @param {string} start @param {string} end */
	async move(start, end, check = false) {
		if ([start, end].every(x => this.valRange(x))) {
			const mover = this.grid[start],
				moved = this.grid[end]
			mover.coord = end
			if (['rook', 'king'].some(x => mover.name == x)) mover.canCastle = false
			this.grid[end] = mover
			delete this.grid[start]
			if (mover.name == 'pawn' && !check &&
				[[1, 8], [2, 1]].some(x => mover.player == `player${x[0]}` &&
					mover.row == x[1])) return [(await doPawnSwap(mover)), moved]
			return [mover, moved]
		}
	}

	/** @param {gamepieces} piece @param {string} coord @param {piecenames} name */
	async swap(piece, coord, name) {
		const Piece = {
			'rook': Rook, 'knight': Knight, 'bishop': Bishop, 'queen': Queen
		}
		if (name in Piece) {
			const /** @type {Pawn | Rook | Knight | Bishop | Queen | King} */
				newPiece = new Piece[name](piece.color, coord, piece.pN, this)
			this.grid[coord] = newPiece
			return newPiece
		}
	}

	checkForCheck(p = 0) {
		const takes = this.allTakes
		return p ? takes.includes(this.findPieceInGrid('king', p)) : [this.findPieceInGrid('king', 1), this.findPieceInGrid('king', 2)]
			.some(x => takes.includes(x))
	}

	checkForCastle(p = 0) {
		const king = this.findPieceInGrid('king', p),
			rook = { 'g1': 'f1', 'c1': 'd1', 'g8': 'f8', 'c8': 'd8' }[king]
		return this.allTakes.includes(rook)
	}

	async checkforCheckmate(p = 0) {
		if (!this.checkForCheck(p)) return false
		const MandT = Object.values(this.grid).reduce((obj, cur) => {
				if (cur.pN != p) return obj
				obj[cur.coord] = [...cur.moves, ...cur.takes]
				return obj
			}, {})
		for (let start in MandT) {
			for (let end of MandT[start]) {
				const copy = Board.from(this.stringify, this.player1, this.player2)
				console.log('start:', start, 'end:', end)
				await copy.move(start, end, true)
				if (!copy.checkForCheck(p)) return false
			}
		}
		return true
	}

	/** @param {piecenames} name */
	findPieceInGrid(name, pN = undefined) {
		for (let coord in this.grid) {
			const cur = this.grid[coord],
				conditions = [cur.name == name, (pN != undefined ? cur.pN == pN : true)]
			if (conditions.every(x => x)) {
				return coord
			}
		}
		return ''
	}

	checkPath(coord) {
		return Object.values(this.grid).reduce((arr, piece) => {
			piece.takefinder(piece.paths)
			return arr
		}, new Array())
	}

	get dark() {
		return Color.darker(this.player1, this.player2).lighten()
	}

	get light() {
		return Color.lighter(this.player1, this.player2).darken()
	}

	get allTakes() {
		return Object.values(this.grid).reduce((arr, piece) => {
			arr.push(...piece.takes)
			return arr
		}, new Array())
	}

	get stringify() {
		return Object.keys(this.grid).reduce((str, cur) => str + `${this.grid[cur].stringify} | `, '').slice(0, -3)
	}

	/** @param {string} savedGame */
	static from(savedGame, p1, p2) {
		const pieces = savedGame.split(' | ').map(x => JSON.parse(x))
		const board = new Board(p1, p2, true),
			classes = { 'pawn': Pawn, 'rook': Rook, 'knight': Knight, 'bishop': Bishop, 'queen': Queen, 'king': King }

		board.grid = pieces.reduce((obj, piece) => {
			obj[piece.coord] = classes[piece.name].from(piece, board)
			return obj
		}, {})
		return board
	}

	#letters = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h' }
	#numbers = [1, 2, 3, 4, 5, 6, 7, 8]
}