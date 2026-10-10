const Paragraph = (props) => {
  const title = props.title;
  const text = props.text;

  return (
    <>
      <h2>
        §{props.paragraph} {title}
      </h2>
      <div dangerouslySetInnerHTML={{ __html: text }} />
      <ul>
        {props.bullets &&
          props.bullets.map((bullet, index) => (
            <li key={index} dangerouslySetInnerHTML={{ __html: bullet }} />
          ))}
      </ul>
    </>
  );
};

export default Paragraph;
