import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import { MIN_GAIN, THEME_MAP } from "../../utils/constants";
import { AudioPlayer } from "../audio-player/AudioPlayer";
import {
    Equalizer,
    EqualizerPoint,
    EqualizerTheme,
    EqualizerType,
} from "../equalizer/Equalizer";
import { IoMdSettings, IoMdColorPalette } from "react-icons/io";
import { IconDropDown } from "../dropdown/IconDropDown";
import { AiFillSave, AiOutlineStop } from "react-icons/ai";
import { BiImport } from "react-icons/bi";
import toWav from "audiobuffer-to-wav";
import { audioContext } from "../../utils/globals";

const defaultPresets = [
    {
        label: "Low Pass",
        value: [
            {
                frequency: 400,
                gain: MIN_GAIN,
                type: EqualizerType.LOW_PASS,
                curve: 125,
            },
        ],
    },
    {
        label: "High Pass",
        value: [
            {
                frequency: 1000,
                gain: MIN_GAIN,
                type: EqualizerType.HIGH_PASS,
                curve: 1,
            },
        ],
    },
];

const themeOptions = Object.entries(EqualizerTheme).map(([key, value]) => ({
    label: (
        <div className="flex w-full justify-between items-center" title={key}>
            <div
                className={twMerge(
                    "w-4 m-1 h-4 rounded-md",
                    THEME_MAP[value].medium
                )}
            ></div>
        </div>
    ),
    value: value,
    component: (
        <div>
            <div
                className={twMerge("w-4 h-4 rounded-md", THEME_MAP[value].dark)}
            ></div>
        </div>
    ),
}));

export const Controls = (): JSX.Element => {
    const equalizerRef = useRef<any>(null);
    const audioPlayerRef = useRef<any>(null);
    const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(
        null
    );
    const [theme, setTheme] = useState(EqualizerTheme.GRAY);
    const [audioPath, setAudioPath] = useState<undefined | string>(undefined);
    const [presets, setPresets] = useState(defaultPresets);
    const [showingPresetNameDialog, setShowingPresetNameDialog] =
        useState(false);
    const [presetName, setPresetName] = useState("");
    const [presetButtonText, setPresetButtonText] = useState("Add Preset");
    const handleChangeTheme = (value: EqualizerTheme) => {
        setTheme(value);
    };

    useEffect(() => {
        setAudioElement(audioPlayerRef.current?.getAudioElement());
    }, [audioPath]);

    const handleReset = () => {
        equalizerRef.current?.reset();
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];
        e.target.blur();
        if (!file) return;

        if (!file.type.startsWith("audio/")) {
            alert("Please select a valid audio file.");
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const url = event.target?.result;
            setAudioPath(url as string);
        };

        reader.onerror = () => {
            alert("Error reading the audio file.");
        };

        reader.readAsDataURL(file);
    };

    const handleSelectPreset = (preset: EqualizerPoint[]) => {
        equalizerRef.current?.setPoints(preset);
    };

    const handleAddPreset = () => {
        if (!presetName) return;
        const newPreset = {
            label: presetName,
            value: equalizerRef.current?.getPoints(),
        };
        const presetExists = presets.find(
            (preset) => preset.label === presetName
        );
        if (presetExists) {
            const index = presets.findIndex(
                (preset) => preset.label === presetName
            );
            const newPresets = [...presets];
            newPresets[index] = newPreset;
            setPresets(newPresets);
        } else {
            setPresets([...presets, newPreset]);
        }
        setShowingPresetNameDialog(false);
        setPresetName("");
    };

    const handleChangePresetName = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPresetName(e.target.value);
        const presetExists = presets.find(
            (preset) => preset.label === e.target.value
        );
        if (presetExists) {
            setPresetButtonText("Save Preset");
        } else {
            setPresetButtonText("Add Preset");
        }
    };

    const downloadAudio = async () => {
        if (!audioElement) return;

        try {
            const response = await fetch(audioPath as string);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const lengthOfAudio = audioBuffer.duration;

            const offlineContext = new OfflineAudioContext({
                numberOfChannels: audioBuffer.numberOfChannels,
                length: audioBuffer.sampleRate * lengthOfAudio,
                sampleRate: audioBuffer.sampleRate,
            });

            const bufferSource = equalizerRef.current?.handleAddFilter(
                offlineContext,
                audioBuffer
            );
            bufferSource.then((source: any) => {
                source.connect(offlineContext.destination);
                source.start();

                offlineContext.startRendering().then((buffer) => {
                    const wav = toWav(buffer);
                    const blob = new window.Blob([new DataView(wav)], {
                        type: "audio/wav",
                    });

                    const url = window.URL.createObjectURL(blob);
                    const anchor = document.createElement("a");
                    anchor.download = "audio.wav";
                    anchor.href = url;
                    anchor.click();
                });
            });
        } catch (error) {
            console.error("Error downloading audio", error);
        }
    };

    return (
        <div className="flex flex-col justify-center items-center h-screen">
            <p className="text-6xl mt-8 text-center font-semibold select-none">
                Web EQ
            </p>
            <p className="text-2xl mb-8 text-center text-slate-500 font-semibold select-none">
                Multiband audio equalizer for the Web
            </p>
            <div className="w-max">
                <div className="flex justify-between mb-2 w-full">
                    <div className="w-full flex gap-1">
                        <button
                            title="import audio file"
                            className={twMerge(
                                "w-max h-8 px-1 flex items-center justify-center rounded-md",
                                THEME_MAP[theme].medium_dark,
                                THEME_MAP[theme].medium_hover
                            )}
                        >
                            <input
                                className="absolute w-36 h-8 opacity-0 cursor-pointer"
                                onChange={handleImportFile}
                                type="file"
                            ></input>
                            <BiImport className="w-6 h-6 text-white" />
                            <p className="mx-1 text-white select-none">
                                Import Audio
                            </p>
                        </button>

                        <button
                            title="download audio file"
                            className={twMerge(
                                "w-max h-8 px-1 flex items-center justify-center rounded-md",
                                THEME_MAP[theme].medium_dark,
                                THEME_MAP[theme].medium_hover
                            )}
                            onClick={downloadAudio}
                        >
                            <BiImport className="w-6 h-6 text-white" />
                            <p className="mx-1 text-white select-none">
                                Download Audio
                            </p>
                        </button>
                    </div>
                    <div className="flex items-center">
                        <div className="mx-1">
                            <IconDropDown
                                options={themeOptions}
                                title="select theme"
                                theme={{
                                    color: THEME_MAP[theme].medium,
                                    hover: THEME_MAP[theme].light_hover,
                                }}
                                icon={
                                    <IoMdColorPalette
                                        color="white"
                                        className="w-6 h-6"
                                    />
                                }
                                onChange={handleChangeTheme}
                            />
                        </div>
                        <div className="">
                            <IconDropDown
                                options={presets}
                                title="select preset"
                                theme={{
                                    color: THEME_MAP[theme].medium,
                                    hover: THEME_MAP[theme].light_hover,
                                }}
                                icon={
                                    <IoMdSettings
                                        color="white"
                                        className="w-6 h-6"
                                    />
                                }
                                onChange={handleSelectPreset}
                            />
                        </div>
                        <div className="relative">
                            <button
                                title="save as preset"
                                className={twMerge(
                                    "w-8 h-8 flex mx-1 items-center justify-center rounded-md",
                                    THEME_MAP[theme].medium,
                                    THEME_MAP[theme].light_hover
                                )}
                                onClick={() =>
                                    setShowingPresetNameDialog(
                                        !showingPresetNameDialog
                                    )
                                }
                            >
                                <AiFillSave color="white" className="w-6 h-6" />
                            </button>
                            <div
                                className={twMerge(
                                    "absolute w-max h-max p-4 rounded-md flex flex-col items-start z-[2000] drop-shadow-lg top-12 left-0",
                                    THEME_MAP[theme].medium
                                )}
                                style={{
                                    display: showingPresetNameDialog
                                        ? "flex"
                                        : "none",
                                }}
                            >
                                <p className="text-sm text-white">
                                    Preset Name
                                </p>
                                <input
                                    onChange={handleChangePresetName}
                                    value={presetName}
                                    className="rounded-sm px-1"
                                    type="text"
                                ></input>
                                <button
                                    className={twMerge(
                                        "text-white px-2 py-1 text-sm rounded-md mt-2",
                                        THEME_MAP[theme].medium_dark,
                                        THEME_MAP[theme].medium_hover
                                    )}
                                    onClick={handleAddPreset}
                                >
                                    {presetButtonText}
                                </button>
                            </div>
                        </div>

                        <button
                            title="reset equalizer"
                            onClick={handleReset}
                            className={twMerge(
                                "w-8 h-8 flex items-center justify-center rounded-md",
                                THEME_MAP[theme].medium_dark,
                                THEME_MAP[theme].medium_hover
                            )}
                        >
                            <AiOutlineStop className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>
                <div className="relative">
                    <Equalizer
                        theme={theme}
                        audioElement={audioElement}
                        audioSourceRef={audioSourceRef}
                        ref={equalizerRef}
                    />
                </div>
                <div className="mt-4">
                    <AudioPlayer
                        theme={theme}
                        ref={audioPlayerRef}
                        path={audioPath}
                        key={audioPath}
                    />
                </div>
            </div>
        </div>
    );
};
