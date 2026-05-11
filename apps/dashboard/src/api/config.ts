const defaultApiBaseUrl =
	"https://p7d9jms82f.execute-api.ap-northeast-2.amazonaws.com";
const defaultCognitoDomain =
	"https://yourmillionare-dev.auth.ap-northeast-2.amazoncognito.com";
const defaultCognitoClientId = "6sop98o9dvge94bsipftmkrkeh";
const defaultCognitoRedirectUri = "http://localhost:3000/callback";
const defaultCognitoLogoutUri = "http://localhost:3000/login";

function trimTrailingSlash(value: string) {
	return value.replace(/\/+$/, "");
}

export const apiConfig = {
	apiBaseUrl: trimTrailingSlash(
		import.meta.env.VITE_YM_API_BASE_URL ?? defaultApiBaseUrl,
	),
	cognitoDomain: trimTrailingSlash(
		import.meta.env.VITE_COGNITO_DOMAIN ?? defaultCognitoDomain,
	),
	cognitoClientId:
		import.meta.env.VITE_COGNITO_CLIENT_ID ?? defaultCognitoClientId,
	cognitoRedirectUri:
		import.meta.env.VITE_COGNITO_REDIRECT_URI ?? defaultCognitoRedirectUri,
	cognitoLogoutUri:
		import.meta.env.VITE_COGNITO_LOGOUT_URI ?? defaultCognitoLogoutUri,
};
