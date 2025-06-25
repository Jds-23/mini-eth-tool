import { type QueryOptions, useQuery } from "@tanstack/react-query";

// Type definitions based on the OpenAPI schema
export type SignatureItem = {
	name: string;
	filtered: boolean;
};

export type SignatureResponse = {
	function?: Record<string, SignatureItem[] | null>;
	event?: Record<string, SignatureItem[]>;
};

interface ApiResponse {
	ok: boolean;
	result: SignatureResponse;
}

interface LookupParams {
	functionHashes?: string[];
	eventHashes?: string[];
	filter?: boolean;
}

// API client function
const lookupSignatures = async (params: LookupParams): Promise<ApiResponse> => {
	const url = new URL("https://api.openchain.xyz/signature-database/v1/lookup");

	if (params.functionHashes?.length) {
		url.searchParams.set("function", params.functionHashes.join(","));
	}

	if (params.eventHashes?.length) {
		url.searchParams.set("event", params.eventHashes.join(","));
	}

	if (params.filter !== undefined) {
		url.searchParams.set("filter", params.filter.toString());
	}

	const response = await fetch(url.toString());

	if (!response.ok) {
		throw new Error(
			`API request failed: ${response.status} ${response.statusText}`,
		);
	}

	return response.json();
};

// Custom hook
export const useSignatureLookup = (
	params: LookupParams,
	options?: Omit<QueryOptions<ApiResponse, Error>, "queryKey" | "queryFn">,
) => {
	return useQuery({
		queryKey: ["signature-lookup", params],
		queryFn: () => lookupSignatures(params),
		enabled: !!(params.functionHashes?.length || params.eventHashes?.length),
		staleTime: Number.POSITIVE_INFINITY, // 5 minutes
		...options,
	});
};

// Helper hook for function signatures only
export const useFunctionSignatureLookup = (
	functionHashes: string[],
	filter = true,
	options?: Omit<QueryOptions<ApiResponse, Error>, "queryKey" | "queryFn">,
) => {
	return useSignatureLookup({ functionHashes, filter }, options);
};

// Helper hook for event signatures only
export const useEventSignatureLookup = (
	eventHashes: string[],
	filter = true,
	options?: Omit<QueryOptions<ApiResponse, Error>, "queryKey" | "queryFn">,
) => {
	return useSignatureLookup({ eventHashes, filter }, options);
};

// Example usage:
/*
// Basic usage
const { data, isLoading, error } = useSignatureLookup({
  functionHashes: ['0xa9059cbb', '0x23b872dd'],
  filter: true
})

// Function signatures only
const { data: functionData } = useFunctionSignatureLookup([
  '0xa9059cbb', // transfer(address,uint256)
  '0x23b872dd'  // transferFrom(address,address,uint256)
])

// Event signatures only
const { data: eventData } = useEventSignatureLookup([
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
])

// With custom options
const { data } = useSignatureLookup(
  { functionHashes: ['0xa9059cbb'] },
  {
    refetchOnWindowFocus: false,
    retry: 3,
    onSuccess: (data) => {
      console.log('Signatures found:', data.result)
    }
  }
)
*/
