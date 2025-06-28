export const isTupleRegex = /^\(.+?\).*?$/;

// https://regexr.com/7gmok
export const errorSignatureRegex =
	/^error (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;

// https://regexr.com/7gmoq
export const eventSignatureRegex =
	/^event (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)$/;

// https://regexr.com/7gmot
export const functionSignatureRegex =
	/^function (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*)\((?<parameters>.*?)\)(?: (?<scope>external|public{1}))?(?: (?<stateMutability>pure|view|nonpayable|payable{1}))?(?: returns\s?\((?<returns>.*?)\))?$/;

// https://regexr.com/7gmp3
export const structSignatureRegex =
	/^struct (?<name>[a-zA-Z$_][a-zA-Z0-9$_]*) \{(?<properties>.*?)\}$/;

// https://regexr.com/78u01
export const constructorSignatureRegex =
	/^constructor\((?<parameters>.*?)\)(?:\s(?<stateMutability>payable{1}))?$/;

// https://regexr.com/78u1k
export const receiveSignatureRegex = /^receive\(\) external payable$/;
