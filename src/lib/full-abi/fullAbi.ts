import {
	AbiConstructor,
	AbiError,
	AbiEvent,
	AbiFunction,
	AbiParameters,
	type Hex,
} from "ox";
import type { Parameter } from "ox/AbiParameters";
import {
	constructorSignatureRegex,
	errorSignatureRegex,
	eventSignatureRegex,
	functionSignatureRegex,
	isTupleRegex,
} from "./regex";

// better fixes than 'as'
export function from(abiItem: string): from.ReturnType {
	if (isTupleRegex.test(abiItem)) {
		return AbiParameters.from(abiItem)[0] as Extract<
			Parameter,
			{ components: readonly Parameter[] }
		>;
	}
	if (errorSignatureRegex.test(abiItem)) {
		return AbiError.from(abiItem) as AbiError.AbiError;
	}
	if (eventSignatureRegex.test(abiItem)) {
		return AbiEvent.from(abiItem) as AbiEvent.AbiEvent;
	}
	if (functionSignatureRegex.test(abiItem)) {
		return AbiFunction.from(abiItem) as AbiFunction.AbiFunction;
	}
	// if (structSignatureRegex.test(abiItem)) {
	//     return AbiStruct.from(abiItem)
	// }
	if (constructorSignatureRegex.test(abiItem)) {
		return AbiConstructor.from(abiItem) as AbiConstructor.AbiConstructor;
	}
	return AbiFunction.from(
		`function ${abiItem}` as string,
	) as AbiFunction.AbiFunction;
}

export declare namespace from {
	type Options = {
		prepare?: boolean;
	};

	type ReturnType =
		| AbiEvent.AbiEvent
		| AbiError.AbiError
		| Extract<Parameter, { components: readonly Parameter[] }>
		| AbiFunction.AbiFunction
		| AbiConstructor.AbiConstructor;
}

export function getParameter(abiItem: from.ReturnType) {
	if ("type" in abiItem && abiItem.type === "function") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "event") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "error") {
		return abiItem.inputs;
	}
	if ("type" in abiItem && abiItem.type === "constructor") {
		return abiItem.inputs;
	}
	// if ("type" in abiItem && abiItem.type === "struct") {
	//     return abiItem.properties
	// }
	if ("components" in abiItem && abiItem.components.length > 0) {
		return abiItem.components;
	}
	return [];
}

export function decode(abiItem: from.ReturnType, data: Hex.Hex) {
	if ("type" in abiItem && abiItem.type === "function") {
		const res = AbiFunction.decodeData(abiItem, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
	// decode event is different
	// if ("type" in abiItem && abiItem.type === "event") {
	//     return AbiEvent.(abiItem, data)
	// }
	if ("type" in abiItem && abiItem.type === "error") {
		const res = AbiError.decode(abiItem, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
	// if ("type" in abiItem && abiItem.type === "constructor") {
	//     const res = AbiConstructor.decode(abiItem, data) ?? [];
	//     return Array.isArray(res) ? res : [res];
	// }
	if ("components" in abiItem && abiItem.components.length > 0) {
		// if (options.packed) {
		//     const res = AbiParameters.d(abiItem.components, data) ?? [];
		//     return Array.isArray(res) ? res : [res];
		// }
		const res = AbiParameters.decode(abiItem.components, data) ?? [];
		return Array.isArray(res) ? res : [res];
	}
	return [];
}

export function encode(
	abiItem: from.ReturnType,
	args: string[],
	options: { bytecode?: Hex.Hex; packed?: boolean } = { packed: false },
) {
	if ("type" in abiItem && abiItem.type === "function") {
		return AbiFunction.encodeData(abiItem, args);
	}
	// if ("type" in abiItem && abiItem.type==="event"){
	//     return AbiEvent.encode(abiItem,args)
	// }
	if ("type" in abiItem && abiItem.type === "error") {
		return AbiError.encode(abiItem, args);
	}
	if ("type" in abiItem && abiItem.type === "constructor") {
		return AbiConstructor.encode(abiItem, {
			args,
			bytecode: options.bytecode ?? "0x",
		});
	}
	if ("components" in abiItem && abiItem.components.length > 0) {
		if (options.packed) {
			return AbiParameters.encodePacked(
				abiItem.components.map((c) => c.type),
				args,
			);
		}
		return AbiParameters.encode(abiItem.components, args);
	}
	return null;
}
