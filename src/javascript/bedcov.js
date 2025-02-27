#!/usr/bin/env -S k8 --single-threaded

function iit_sort_copy(a) {
	a.sort((x, y) => (x[0] - y[0]));
	let b = [];
	for (let i = 0; i < a.length; ++i)
		b.push(a[i].slice(0));
	return b;
}

function iit_index(a) {
	if (a.length == 0) return -1;
	let last, last_i, k;
	for (let i = 0; i < a.length; i += 2) last = a[i][2] = a[i][1], last_i = i;
	for (k = 1; 1<<k <= a.length; ++k) {
		const i0 = (1<<k) - 1, step = 1<<(k+1), x = 1<<(k-1);
		for (let i = i0; i < a.length; i += step) {
			a[i][2] = a[i][1];
			if (a[i][2] < a[i-x][2]) a[i][2] = a[i-x][2];
			let e = i + x < a.length? a[i+x][2] : last;
			if (a[i][2] < e) a[i][2] = e;
		}
		last_i = last_i>>k&1? last_i - x : last_i + x;
		if (last_i < a.length) last = last > a[last_i][2]? last : a[last_i][2];
	}
	return k - 1;
}

function iit_overlap(a, st, en) {
	let h = 0, stack = [], b = [];
	for (h = 0; 1<<h <= a.length; ++h);
	--h;
	stack.push([(1<<h) - 1, h, 0]);
	while (stack.length) {
		const t = stack.pop();
		const x = t[0], h = t[1], w = t[2];
		if (h <= 3) {
			const i0 = x >> h << h;
			let i1 = i0 + (1<<(h+1)) - 1;
			if (i1 >= a.length) i1 = a.length;
			for (let i = i0; i < i1 && a[i][0] < en; ++i)
				if (st < a[i][1]) b.push(a[i]);
		} else if (w == 0) { // if left child not processed
			stack.push([x, h, 1]);
			const y = x - (1<<(h-1));
			if (y >= a.length || a[y][2] > st)
				stack.push([y, h - 1, 0]);
		} else if (x < a.length && a[x][0] < en) {
			if (st < a[x][1]) b.push(a[x]);
			stack.push([x + (1<<(h-1)), h - 1, 0]);
		}
	}
	return b;
}

function splitmix32(a) { // https://github.com/bryc/code/blob/master/jshash/PRNGs.md
	return function() {
		a |= 0; a = a + 0x9e3779b9 | 0;
		let t = a ^ a >>> 16;
		t = Math.imul(t, 0x21f0aaad);
		t = t ^ t >>> 15;
		t = Math.imul(t, 0x735a2d97);
		return (t = t ^ t >>> 15) >>> 0;
	}
}

function gen_intv(n, rng, bit_st, bit_len) {
	const mask_st = (1<<bit_st) - 1;
	const mask_len = (1<<bit_len) - 1;
	let a = [];
	for (let i = 0; i < n; ++i) {
		const st = rng() & mask_st;
		const len = rng() & mask_len;
		a.push([st, st + len]);
	}
	return a;
}

var ccc = {
	print: typeof print == "function"? print : console.log,
	argv: typeof k8_version == "function"? arguments.slice(0) : typeof Deno == "object"? Deno.args.slice(0) : typeof Bun == "function"? Bun.argv.slice(2) : process.argv.splice(2)
};

function main(args)
{
	let bit_st = 28, bit_len = 14, seed = 11, n = 1000000;
	if (args.length >= 1) n = parseInt(args[0]);
	let rng = splitmix32(seed)
	const a1 = iit_sort_copy(gen_intv(n, rng, bit_st, bit_len));
	const a2 = gen_intv(n, rng, bit_st, bit_len);
	iit_index(a1);
	let tot_cov = 0;
	for (let j = 0; j < a2.length; ++j) {
		const st0 = a2[j][0], en0 = a2[j][1];
		const a = iit_overlap(a1, st0, en0);
		let cov_st = 0, cov_en = 0, cov = 0;
		for (let i = 0; i < a.length; ++i) {
			const st1 = a[i][0] > st0? a[i][0] : st0;
			const en1 = a[i][1] < en0? a[i][1] : en0;
			if (st1 > cov_en) {
				cov += cov_en - cov_st;
				cov_st = st1, cov_en = en1;
			} else cov_en = cov_en > en1? cov_en : en1;
		}
		cov += cov_en - cov_st;
		tot_cov += cov;
	}
	ccc.print(tot_cov);
}

main(ccc.argv);
