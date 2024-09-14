import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { Button } from "@nextui-org/button";

import { BlockfrostProvider, BrowserWallet, mConStr, MeshTxBuilder, PlutusScript, resolveScriptHash, stringToHex } from "@meshsdk/core";
import { applyCborEncoding, applyParamsToScript } from "@meshsdk/core-csl";

const Script = {
  MintAlwaysTrue: applyCborEncoding(
    "58b801010032323232323232323225333003323232323253330083370e900018051baa0011325333333010003153330093370e900018059baa0031533300d300c37540062944020020020020020020dd7180698059baa00116300c300d002300b001300b0023009001300637540022930a998022491856616c696461746f722072657475726e65642066616c73650013656153300249010f5f72656465656d65723a20566f696400165734ae7155ceaab9e5573eae855d12ba41"
  ),

  MintCheckRedeemer: applyCborEncoding(
    "58c4010100323232323232323225333003323232323253330083370e900018051baa001132533333300f003008008008153330093370e6eb400d205414a22a660149211672656465656d6572203d3d203432203f2046616c73650014a00106eb8c030c02cdd50008b1805980600118050009805001180400098031baa001149854cc0112411856616c696461746f722072657475726e65642066616c73650013656153300249010d72656465656d65723a20496e7400165734ae7155ceaab9e5742ae895d201"
  ),

  MintCheckRedeemer2: applyCborEncoding(
    "59017e01010032323232323232323225333003323232323253330083370e900018051baa0011325333333010003153330093370e900018059baa003132533300e001009132533333301200100a00a00a00a13232533301100100c132533333301500100d00d00d1325333013301500313232533301153330113371e6eb8c05800922010d48656c6c6f2c20576f726c64210014a22a660249211e6b6579203d3d202248656c6c6f2c20576f726c642122203f2046616c73650014a02a66602266e1c005205414a22a660249211376616c7565203d3d203432203f2046616c73650014a02940dd6980a980b00098091baa00900e375a00201a602400260240066eb8004c03c004c030dd50018040040040040041bae300d300b37540022c6018601a004601600260160046012002600c6ea800452615330044911856616c696461746f722072657475726e65642066616c73650013656153300249011272656465656d65723a2052656465656d657200165734ae7155ceaab9e5573eae855d12ba41"
  ),

  MintNFT: applyCborEncoding(
    "59027d01010032323232323232323232322253330053232323232533300a3370e900018061baa00113253333330130031533300b3370e900018069baa0031533300f300e37540062646464a66601c66e1d2002001153300f49010a4973204d696e74696e67001533300e323300100100322533301400114a0264a66602266ebcc05cc050dd5180b8010070a51133003003001301700114a22a6601e9212e636f6e73756d655f7574786f28696e707574732c206f75747075745f7265666572656e636529203f2046616c73650014a02a66601c66e1d2001001153300f4910a4973204275726e696e670014a22a6601e9210b496e76616c6964205174790014a064a66602400201a264a666026602c00426eb4c048004038c050004c94ccc038cdc3a400460206ea800452f5bded8c026eacc050c044dd500099198008009bab3014301530153015301500322533301300114c103d87a80001323232325333013337220120042a66602666e3c0240084cdd2a4000660306e980052f5c02980103d87a80001330060060033756602a0066eb8c04c008c05c008c054004dd6180900098071baa005009009009009009009375c6020601a6ea800458c03cc040008c038004c038008c030004c020dd50008a4c2a6600c9211856616c696461746f722072657475726e65642066616c73650013656153300349010f5f72656465656d65723a20566f6964001615330024915b657870656374205b50616972285f2c20717479295d203d0a202020206d696e740a2020202020207c3e206173736574732e746f6b656e7328706f6c6963795f6964290a2020202020207c3e20646963742e746f5f7061697273282900165734ae7155ceaab9e5573eae815d0aba257481"
  ),
};

export default function Dashboard(props: { wallet: BrowserWallet; address: string; setActionResult: (result: string) => void; onError: (error: any) => void }) {
  const { wallet, address, setActionResult, onError } = props;

  async function submitTx(tx: string) {
    const txSigned = await wallet.signTx(tx);
    const txHash = await wallet.submitTx(txSigned);

    return txHash;
  }

  type Action = () => Promise<void>;
  type ActionGroup = Record<string, Action>;

  const actions: Record<string, ActionGroup> = {
    AlwaysTrue: {
      mint: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintAlwaysTrue, "V3");
          const assetName = "Always True Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, []);

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("1000", policyID, assetNameHex)
            .mintingScript(Script.MintAlwaysTrue)
            .mintRedeemerValue(redeemer)
            .metadataValue(
              "721",
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/1",
                  },
                },
              }
            )
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintAlwaysTrue, "V3");
          const assetName = "Always True Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, []);

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("-1000", policyID, assetNameHex)
            .mintingScript(Script.MintAlwaysTrue)
            .mintRedeemerValue(redeemer)
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },

    CheckRedeemer: {
      mint: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintCheckRedeemer, "V3");
          const assetName = "Check Redeemer Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = 42n;

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("200", policyID, assetNameHex)
            .mintingScript(Script.MintCheckRedeemer)
            .mintRedeemerValue(redeemer)
            .metadataValue(
              "721",
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/2",
                  },
                },
              }
            )
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintCheckRedeemer, "V3");
          const assetName = "Check Redeemer Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = 42n;

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("-200", policyID, assetNameHex)
            .mintingScript(Script.MintCheckRedeemer)
            .mintRedeemerValue(redeemer)
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },

    CheckRedeemer2: {
      mint: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintCheckRedeemer2, "V3");
          const assetName = "Check Redeemer2 Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, ["Hello, World!", 42n]);

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("30", policyID, assetNameHex)
            .mintingScript(Script.MintCheckRedeemer2)
            .mintRedeemerValue(redeemer)
            .metadataValue(
              "721",
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/3",
                  },
                },
              }
            )
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const policyID = resolveScriptHash(Script.MintCheckRedeemer2, "V3");
          const assetName = "Check Redeemer2 Token";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, ["Hello, World!", 42n]);

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("-30", policyID, assetNameHex)
            .mintingScript(Script.MintCheckRedeemer2)
            .mintRedeemerValue(redeemer)
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },

    NFT: {
      mint: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          // Find a non-collateral UTxO
          const utxo = utxos.find((utxo) => utxo.input.txHash !== input.txHash && utxo.input.outputIndex != input.outputIndex);
          if (!utxo) throw "Cannot Consume Collateral";

          // https://aiken-lang.github.io/stdlib/cardano/transaction.html#OutputReference
          const txHash = utxo.input.txHash;
          const txIndex = utxo.input.outputIndex;
          const outputReference = mConStr(0, [txHash, txIndex]);

          const mintingScript = applyParamsToScript(Script.MintNFT, [outputReference]);
          const mintingValidator: PlutusScript = { version: "V3", code: applyCborEncoding(mintingScript) };

          console.log(mintingValidator);
          setActionResult(`SAVE THIS MINTING VALIDATOR SCRIPT FOR BURNING: ${mintingValidator.code}`);

          const policyID = resolveScriptHash(mintingValidator.code, "V3");
          const assetName = "NFT";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, []);

          const tx = await mesh
            .mintPlutusScriptV3()
            .mint("1", policyID, assetNameHex)
            .mintingScript(mintingValidator.code)
            .mintRedeemerValue(redeemer)
            .metadataValue(
              "721",
              // https://github.com/cardano-foundation/CIPs/tree/master/CIP-0025#version-1
              {
                [policyID]: {
                  [assetName]: {
                    name: assetName,
                    image: "https://avatars.githubusercontent.com/u/4",
                  },
                },
              }
            )
            .selectUtxosFrom(utxos)
            .txIn(utxo.input.txHash, utxo.input.outputIndex)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },

      burn: async () => {
        try {
          const blockfrost = new BlockfrostProvider(`${process.env.NEXT_PUBLIC_BF_PID}`);
          const mesh = new MeshTxBuilder({ fetcher: blockfrost, evaluator: blockfrost }); // DO NOT REUSE BUILDER

          const utxos = await wallet.getUtxos();

          const collaterals = await wallet.getCollateral();
          const { input } = collaterals[0];

          const mintingValidator: PlutusScript = {
            version: "V3",
            code: "5902ab5902a8010100332323232323232323232322253330053232323232533300a3370e900018061baa00113253333330130031533300b3370e900018069baa0031533300f300e37540062646464a66601c66e1d2002001153300f4910a4973204d696e74696e67001533300e323300100100322533301400114a0264a66602266ebcc05cc050dd5180b8010070a51133003003001301700114a22a6601e9212e636f6e73756d655f7574786f28696e707574732c206f75747075745f7265666572656e636529203f2046616c73650014a02a66601c66e1d2001001153300f4910a4973204275726e696e670014a22a6601e9210b496e76616c6964205174790014a064a66602400201a264a666026602c00426eb4c048004038c050004c94ccc038cdc3a400460206ea800452f5bded8c026eacc050c044dd500099198008009bab3014301530153015301500322533301300114c103d87a80001323232325333013337220120042a66602666e3c0240084cdd2a4000660306e980052f5c02980103d87a80001330060060033756602a0066eb8c04c008c05c008c054004dd6180900098071baa005009009009009009009375c6020601a6ea800458c03cc040008c038004c038008c030004c020dd50008a4c2a6600c9211856616c696461746f722072657475726e65642066616c73650013656153300349010f5f72656465656d65723a20566f6964001615330024915b657870656374205b50616972285f2c20717479295d203d0a202020206d696e740a2020202020207c3e206173736574732e746f6b656e7328706f6c6963795f6964290a2020202020207c3e20646963742e746f5f7061697273282900165734ae7155ceaab9e5573eae815d0aba2574898127d8799f5820bf9e86d716393104f72d223ecbe9179275e29f58b5023f2e708e02c0f8e0d9dd00ff0001",
          };

          const policyID = resolveScriptHash(mintingValidator.code, "V3");
          const assetName = "NFT";
          const assetNameHex = stringToHex(assetName);
          const redeemer = mConStr(0, []);

          let tx = await mesh
            .mintPlutusScriptV3()
            .mint("-1", policyID, assetNameHex)
            .mintingScript(mintingValidator.code)
            .mintRedeemerValue(redeemer)
            .selectUtxosFrom(utxos)
            .txInCollateral(input.txHash, input.outputIndex)
            .changeAddress(address)
            .complete();

          submitTx(tx).then(setActionResult).catch(onError);
        } catch (error) {
          onError(error);
        }
      },
    },
  };

  return (
    <div className="flex flex-col gap-2">
      <span>{address}</span>

      <Accordion variant="splitted">
        {/* Always True */}
        <AccordionItem key="1" aria-label="Accordion 1" title="Always True">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onClick={actions.AlwaysTrue.mint}>
              Mint
            </Button>
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onClick={actions.AlwaysTrue.burn}>
              Burn
            </Button>
          </div>
        </AccordionItem>

        {/* Check Redeemer */}
        <AccordionItem key="2" aria-label="Accordion 2" title="Check Redeemer">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onClick={actions.CheckRedeemer.mint}
            >
              Mint
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onClick={actions.CheckRedeemer.burn}
            >
              Burn
            </Button>
          </div>
        </AccordionItem>

        {/* Check Redeemer2 */}
        <AccordionItem key="3" aria-label="Accordion 3" title="Check Redeemer2">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onClick={actions.CheckRedeemer2.mint}
            >
              Mint
            </Button>
            <Button
              className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize"
              radius="full"
              onClick={actions.CheckRedeemer2.burn}
            >
              Burn
            </Button>
          </div>
        </AccordionItem>

        {/* NFT */}
        <AccordionItem key="4" aria-label="Accordion 4" title="NFT">
          <div className="flex flex-wrap gap-2 mb-2">
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onClick={actions.NFT.mint}>
              Mint
            </Button>
            <Button className="bg-gradient-to-tr from-pink-500 to-yellow-500 text-white shadow-lg capitalize" radius="full" onClick={actions.NFT.burn}>
              Burn
            </Button>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
