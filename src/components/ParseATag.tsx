/* eslint-disable @next/next/no-img-element */
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { CgArrowsExpandDownRight, CgArrowsExpandUpLeft } from "react-icons/cg";

const ParseATag = (props) => {
  const [link, setLink] = useState("");
  const [expandable, setExpandable] = useState(false);
  const [expand, setExpand] = useState(false);
  const [linkText, setLinkText] = useState(props?.children?.data);
  useEffect(() => {
    const checkSupport = (link: string) => {
      let imgurRegex = /([A-z.]+\.)?(imgur(\.com))+(\/)+([A-z0-9]){7}\./gm;
      let redditRegex =
        /(preview+\.)+(reddit(\.com)|redd(\.it))+(\/[A-z0-9]+)+(\.(png|jpg))\./gm;
      let greedyRegex = /(\.(png|jpg))/gm;
      return !!(
        link.match(imgurRegex) ||
        link.match(redditRegex) ||
        link.match(greedyRegex)
      );
    };

    const findLinkText = (data, iter = 0) => {
      if (iter > 5) {
        return;
      }
      if (data?.data) {
        setLinkText(data?.data);
        return;
      } else if (data?.children?.[0]) {
        findLinkText(data?.children[0], iter + 1);
      }
      return;
    };

    const link = props?.children?.parent?.attribs?.href;
    findLinkText(props?.children);
    setLink(link);
    setExpandable(checkSupport(link));
  }, []);

  const handleClick = async (e) => {
    if (expandable) {
      e.preventDefault();
      e.stopPropagation();
      setExpand((e) => !e);
    }
  };
  if (!expandable) {
    return <>{linkText}</>;
  }

  return (
    <>
      <div className={" inline-block"} onClick={handleClick}>
        {linkText}
        {expandable && (
          <button
            aria-label="expand"
            className={
              "flex-row items-center h-6 px-1 space-x-1 border rounded-md border-th-border hover:border-th-borderHighlight  text-th-text inline-block mx-1.5"
            }
          >
            {expand ? (
              <CgArrowsExpandUpLeft className="flex-none w-4 h-4" />
            ) : (
              <CgArrowsExpandDownRight className="flex-none w-4 h-4" />
            )}
          </button>
        )}
      </div>
      {expand && (
        <div
          className="flex flex-col"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <img className="max-h-[60vh] mx-auto py-0 my-0" src={link} alt="" />
        </div>
      )}
    </>
  );
};

export default ParseATag;
