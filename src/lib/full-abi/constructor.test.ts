import { AbiConstructor, type Hex } from "ox";
import { expect, test } from "vitest";
import { fullAbi } from "./index";

test("constructor", () => {
	const abi = "constructor(address owner, uint256 amount)" as const;
	const abiItem = fullAbi.from(abi);
	const params = fullAbi.getParameter(abiItem);
	const bytecode = "0x" as const;
	const encoded = fullAbi.encode(
		abiItem,
		["0xd8da6bf26964af9d7eed9e03e53415d37aa96045", "123"],
		{ bytecode },
	) as `0x${string}`;
	const decoded = fullAbi.decode(abiItem, {
		bytecode,
		data: encoded,
	});
	expect(abiItem.type).toBe("constructor");
	expect(params).toEqual([
		{ name: "owner", type: "address" },
		{ name: "amount", type: "uint256" },
	]);
	expect(encoded).toBe(
		AbiConstructor.encode(abiItem as AbiConstructor.AbiConstructor, {
			bytecode,
			args: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045", 123n],
		}),
	);
	expect(decoded).toEqual(["0xd8da6bf26964af9d7eed9e03e53415d37aa96045", 123n]);
});

test("constructor with no parameters", () => {
	const abi = "constructor()" as const;
	const abiItem = fullAbi.from(abi);
	const params = fullAbi.getParameter(abiItem);
	const bytecode = "0x" as const;
	const encoded = fullAbi.encode(abiItem, [], { bytecode }) as `0x${string}`;
	const decoded = fullAbi.decode(abiItem, { bytecode, data: encoded });
	expect(params).toEqual([]);
	expect(encoded).toBe(
		AbiConstructor.encode(abiItem as AbiConstructor.AbiConstructor, {
			bytecode,
			args: [],
		}),
	);
	expect(decoded).toEqual([]);
});

test("throws on missing bytecode", () => {
	const abiItem = fullAbi.from("constructor(address owner)");
	expect(() =>
		fullAbi.decode(abiItem, { data: "0x" } as unknown as Hex.Hex),
	).toThrow("Constructor decoding requires { bytecode, data } object");
});

test("throws on invalid decode data type", () => {
	const abiItem = fullAbi.from("constructor(address owner)");
	expect(() =>
		fullAbi.decode(abiItem, "0x" as unknown as { bytecode: Hex.Hex }),
	).toThrow("Constructor decoding requires { bytecode, data } object");
});
