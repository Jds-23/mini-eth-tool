import { expect, test } from "vitest";
import { fullAbi } from "./index";

const abi = [
	{
		type: "function",
		name: "transfer",
		inputs: [
			{ name: "to", type: "address" },
			{ name: "amount", type: "uint256" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "event",
		name: "Transfer",
		inputs: [
			{ indexed: true, name: "from", type: "address" },
			{ indexed: true, name: "to", type: "address" },
			{ indexed: false, name: "value", type: "uint256" },
		],
		anonymous: false,
	},
] as const;

test("select by name", () => {
	const item = fullAbi.fromAbi(abi, "transfer");
	console.log(item);
	expect(item).not.toBeNull();
	if (item) {
		expect("type" in item && item.type).toBe("function");
		// @ts-expect-error
		expect(item.name).toBe("transfer");
	}
});

test("select by selector", () => {
	const item = fullAbi.fromAbi(abi, "0xa9059cbb");
	expect(item).not.toBeNull();
	if (item) {
		expect("type" in item && item.type).toBe("function");
		// @ts-expect-error
		expect(item.name).toBe("transfer");
	}
});

test("returns null for unknown", () => {
	expect(fullAbi.fromAbi(abi, "foo")).toBeNull();
	expect(fullAbi.fromAbi(abi, "0x00000000")).toBeNull();
});
