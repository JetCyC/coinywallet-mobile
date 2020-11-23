import Engine from '../core/Engine';
import Networks, { isKnownNetwork } from './networks';
import { toChecksumAddress } from 'ethereumjs-util';
import { toBN, hexToBN, renderFromWei, renderFromTokenMinimalUnit } from './number';
import { strings } from '../../locales/i18n';

export default async function findFirstIncomingTransaction(networkType, selectedAddress, thirPartyApiMode) {
	// Pull txs if allowed
	thirPartyApiMode && (await Engine.refreshTransactionHistory());
	// Find the incoming TX
	const { TransactionController, TokenBalancesController, AssetsController } = Engine.context;
	const { transactions } = TransactionController.state;
	const networkId = Networks[networkType].networkId;
	if (transactions.length) {
		const txs = transactions.filter(
			tx =>
				tx.transaction.to &&
				toChecksumAddress(tx.transaction.to) === selectedAddress &&
				((networkId && networkId.toString() === tx.networkID) ||
					(networkType === 'rpc' && !isKnownNetwork(tx.networkID))) &&
				tx.status === 'confirmed'
		);
		if (txs.length > 0) {
			return {
				asset: 'ETH',
				from: toChecksumAddress(txs[0].transaction.from),
				amount: `${renderFromWei(hexToBN(txs[0].transaction.value))} ${strings('unit.eth')}`
			};
		}
	}

	// Find the tokens received
	const { contractBalances: tokenBalances } = TokenBalancesController.state;
	const { tokens } = AssetsController.state;
	let tokenFound = null;
	tokens.forEach(token => {
		if (tokenBalances[token.address].gt(toBN('0'))) {
			tokenFound = {
				asset: token.symbol,
				amount: `${renderFromTokenMinimalUnit(tokenBalances[token.address], token.decimals)} ${token.symbol}`
			};
		}
	});

	return tokenFound;
}