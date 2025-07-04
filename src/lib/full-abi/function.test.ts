import { AbiFunction, type Hex } from "ox";
import { expect, test } from "vitest";
import { fullAbi } from "./index";

test("function", () => {
	const abi = "function foo(uint256 a, uint256 b)" as const;
	const abiItem = fullAbi.from(abi);
	const params = fullAbi.getParameter(abiItem);
	const encoded = fullAbi.encode(abiItem, ["1", "2"]);
	const decoded = fullAbi.decode(abiItem, encoded ?? "0x");
	expect(abiItem.type).toBe("function");
	expect(params).toEqual([
		{ name: "a", type: "uint256" },
		{ name: "b", type: "uint256" },
	]);
	expect(encoded).toBe(
		AbiFunction.encodeData(abiItem as AbiFunction.AbiFunction, ["1", "2"]),
	);
	expect(decoded).toEqual([1n, 2n]);
});

test("throws on invalid decode type", () => {
	const abiItem = fullAbi.from("function foo(uint256 a)");
	expect(() =>
		fullAbi.decode(abiItem, { data: "0x", topics: [] } as unknown as Hex.Hex),
	).toThrow("Function decoding requires topics and data object");
});

// test('error', () => {
//     const abi = `error Foo(uint256 a, uint256 b)`
//     const abiItem = fullAbi.from(abi)
//     console.log(abiItem)
//     console.log(fullAbi.getParameter(abiItem))
//     console.log(fullAbi.encode(abiItem, ['1', '2']))
//     console.log(fullAbi.decode(abiItem, fullAbi.encode(abiItem, ['1', '2'])??'0x'))
// })
